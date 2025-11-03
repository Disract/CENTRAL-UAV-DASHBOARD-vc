# app.py
from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room
import threading
import time
import base64
import cv2
import numpy as np
from datetime import datetime

from services.uav_simulator import UAVSimulator
from services.mission_manager import MissionManager
from services.geofence_manager import GeofenceManager
from services.video_feed_manager import VideoFeedManager
from models.uav import UAVType
from models.user import User, UserRole

# Simplified ORB-SLAM import
try:
    from python_orb_slam3 import ORBExtractor
    HAS_ORB_SLAM = True
    print("✓ Using python_orb_slam3")
except ImportError:
    HAS_ORB_SLAM = False
    print("⚠ python_orb_slam3 not found, using OpenCV ORB fallback")

app = Flask(__name__)
app.config['SECRET_KEY'] = 'military-uav-dashboard-classified'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize services
simulator = UAVSimulator()
mission_manager = MissionManager()
geofence_manager = GeofenceManager()
video_manager = VideoFeedManager()

# Mock users for demo
users = {
    'commander': User('commander', 'Commander Alpha', UserRole.COMMANDER, 'password123'),
    'operator':  User('operator',  'Operator Bravo',   UserRole.OPERATOR,   'password123'),
    'analyst':   User('analyst',   'Analyst Charlie',  UserRole.ANALYST,    'password123')
}

def init_demo_uavs():
    simulator.add_uav("REAPER-01", UAVType.FIXED_WING, 12.8406, 80.1530, "MQ-9 Reaper")
    simulator.add_uav("PREDATOR-02", UAVType.FIXED_WING, 12.8450, 80.1600, "MQ-1 Predator")
    simulator.add_uav("RAVEN-03", UAVType.QUADCOPTER, 12.8420, 80.1505, "RQ-11 Raven")
    simulator.add_uav("WASP-04", UAVType.QUADCOPTER, 12.8385, 80.1555, "AeroVironment Wasp")
    simulator.add_uav("HAWK-05", UAVType.FIXED_WING, 12.8445, 80.1480, "RQ-21 Blackjack")
    simulator.add_uav("SHADOW-06", UAVType.FIXED_WING, 12.8465, 80.1525, "RQ-7 Shadow")

def init_geofences():
    geofence_manager.add_geofence("NFZ-001", "Main Academic Block", [
        [12.8425, 80.1520], [12.8425, 80.1540], 
        [12.8405, 80.1540], [12.8405, 80.1520]
    ], "red")
    
    geofence_manager.add_geofence("NFZ-002", "Hostel Zone", [
        [12.8380, 80.1500], [12.8380, 80.1520],
        [12.8360, 80.1520], [12.8360, 80.1500]
    ], "orange")

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html', user=users[session['user_id']])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username in users and users[username].password == password:
            session['user_id'] = username
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='Invalid credentials')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))

@app.route('/api/uavs')
def get_uavs():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    uavs_data = [uav.to_dict() for uav in simulator.uavs.values()]
    return jsonify(uavs_data)

@app.route('/api/missions')
def get_missions():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify(mission_manager.get_all_missions())

@app.route('/api/geofences')
def get_geofences():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify(geofence_manager.get_all_geofences())

@app.route('/api/video-feeds')
def get_video_feeds():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify(video_manager.get_all_feeds())

@app.route('/api/uav/<uav_id>/command', methods=['POST'])
def send_uav_command(uav_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user = users[session['user_id']]
    if user.role not in [UserRole.COMMANDER, UserRole.OPERATOR]:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    command = request.json.get('command')
    success = False
    
    if command == 'pause':
        success = simulator.toggle_uav_pause(uav_id)
    elif command == 'kill':
        success = simulator.kill_uav(uav_id)
    elif command == 'rtb':
        success = simulator.return_to_base(uav_id)
    
    mission_manager.add_log_entry(f"Command '{command}' sent to {uav_id} by {user.name}")
    
    return jsonify({'success': success})

@app.route('/api/mission/create', methods=['POST'])
def create_mission():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user = users[session['user_id']]
    if user.role != UserRole.COMMANDER:
        return jsonify({'error': 'Only commanders can create missions'}), 403
    
    mission_data = request.json
    mission_id = mission_manager.create_mission(
        mission_data['name'],
        mission_data['description'],
        mission_data['uav_ids'],
        user.name
    )
    
    return jsonify({'mission_id': mission_id})

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    print(f'[SOCKET] Client connected: {request.sid}')
    
    # Send initial data
    emit('uav_data', [uav.to_dict() for uav in simulator.uavs.values()])
    emit('mission_data', mission_manager.get_all_missions())
    emit('geofence_data', geofence_manager.get_all_geofences())

@socketio.on('disconnect')
def handle_disconnect():
    print(f'[SOCKET] Client disconnected: {request.sid}')

# ORB STREAMING CONFIG
EMIT_FPS = 10  # Increased FPS for smoother video
JPEG_QUALITY = 75
MAX_WIDTH = 640

FALLBACK_VIDEO_PATHS = [
    "static/videos/vid1.mp4",
    "static/videos/vid2.mp4",
    "static/videos/vid3.mp4",
    "static/videos/vid4.mp4"
]

def encode_jpeg_to_dataurl(img_bgr):
    """Convert BGR image to JPEG data URL"""
    is_success, buf = cv2.imencode('.jpg', img_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not is_success:
        return None
    b64 = base64.b64encode(buf.tobytes()).decode('utf-8')
    return f"data:image/jpeg;base64,{b64}"

def get_video_paths():
    """Get video paths from manager or use fallback"""
    feeds = []
    try:
        feeds = video_manager.get_all_feeds() or []
    except Exception:
        feeds = []
    
    paths = []
    for f in feeds:
        p = f.get('path') or f.get('url') or None
        if p:
            paths.append(p)
    
    # Fill with fallback if needed
    while len(paths) < 4:
        if len(paths) < len(FALLBACK_VIDEO_PATHS):
            paths.append(FALLBACK_VIDEO_PATHS[len(paths)])
        else:
            break
    
    return paths[:4]

def process_stream(stream_id, video_path):
    """Simple stream processing with small ORB keypoint dots"""
    print(f"[ORB-{stream_id}] Starting stream: {video_path}")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[ORB-{stream_id}] ERROR: Cannot open video")
        return
    
    # Initialize ORB extractor
    if HAS_ORB_SLAM:
        try:
            orb_extractor = ORBExtractor()
            print(f"[ORB-{stream_id}] Using ORB-SLAM3")
        except Exception as e:
            print(f"[ORB-{stream_id}] ORB-SLAM3 failed: {e}, using OpenCV")
            orb_extractor = cv2.ORB_create(nfeatures=2000)
    else:
        orb_extractor = cv2.ORB_create(nfeatures=2000)
        print(f"[ORB-{stream_id}] Using OpenCV ORB")
    
    frame_interval = 1.0 / float(EMIT_FPS)
    last_emit = 0.0
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            # Loop video
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            frame_count = 0
            time.sleep(0.1)
            continue
        
        frame_count += 1
        
        # Resize if needed
        h, w = frame.shape[:2]
        if w > MAX_WIDTH:
            scale = MAX_WIDTH / float(w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
        
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Extract keypoints and descriptors
        try:
            if HAS_ORB_SLAM:
                keypoints, descriptors = orb_extractor.detectAndCompute(gray)
            else:
                keypoints, descriptors = orb_extractor.detectAndCompute(gray, None)
        except Exception as e:
            print(f"[ORB-{stream_id}] Detection error: {e}")
            keypoints = []
        
        # Draw keypoints (small dots with flags=0)
        frame_with_keypoints = cv2.drawKeypoints(
            frame, keypoints, None, color=(0, 255, 0), flags=0
        )
        
        # Rate-limited emission
        now = time.time()
        if now - last_emit >= frame_interval:
            dataurl = encode_jpeg_to_dataurl(frame_with_keypoints)
            if dataurl:
                try:
                    socketio.emit('frame', {'id': stream_id, 'image': dataurl}, namespace='/')
                    if frame_count % 50 == 0:  # Log every 50 frames
                        print(f"[ORB-{stream_id}] Frame {frame_count}, keypoints: {len(keypoints)}")
                except Exception as e:
                    print(f"[ORB-{stream_id}] Emit error: {e}")
            last_emit = now
        
        # Small sleep to prevent CPU overload
        time.sleep(0.01)

def start_orb_stream_threads():
    """Start ORB streaming threads"""
    video_paths = get_video_paths()
    print(f"[ORB] Starting {len(video_paths)} video streams")
    print(f"[ORB] Video paths: {video_paths}")
    
    for i, path in enumerate(video_paths):
        t = threading.Thread(target=process_stream, args=(i, path), daemon=True, name=f"ORB-Stream-{i}")
        t.start()
        print(f"[ORB] Started thread for stream {i}")

# Background update broadcaster
def broadcast_updates():
    """Background thread to broadcast real-time updates"""
    print("[BROADCAST] Starting update broadcaster")
    
    while True:
        try:
            simulator.update_all_uavs()
            
            # Broadcast to all connected users
            uavs_data = [uav.to_dict() for uav in simulator.uavs.values()]
            socketio.emit('uav_update', uavs_data, namespace='/')
            
            # Check for alerts and violations
            alerts = []
            for uav in simulator.uavs.values():
                if geofence_manager.check_violation(uav.lat, uav.lon):
                    alerts.append({
                        'type': 'geofence_violation',
                        'uav_id': uav.id,
                        'message': f'{uav.id} has violated restricted airspace',
                        'severity': 'high',
                        'timestamp': datetime.now().isoformat()
                    })
                
                if uav.battery_level < 20:
                    alerts.append({
                        'type': 'low_battery',
                        'uav_id': uav.id,
                        'message': f'{uav.id} battery critically low: {uav.battery_level}%',
                        'severity': 'medium',
                        'timestamp': datetime.now().isoformat()
                    })
            
            if alerts:
                socketio.emit('alerts', alerts, namespace='/')
            
            # Update video feeds
            try:
                video_feeds = video_manager.update_feeds()
                socketio.emit('video_update', video_feeds, namespace='/')
            except Exception:
                pass
        
        except Exception as e:
            print(f"[BROADCAST] Error: {e}")
        
        time.sleep(1)

if __name__ == '__main__':
    # Initialize demo data
    init_demo_uavs()
    init_geofences()
    
    # Start background update thread
    update_thread = threading.Thread(target=broadcast_updates, daemon=True, name="UAV-Broadcast")
    update_thread.start()
    
    # Start ORB streaming threads
    start_orb_stream_threads()
    
    print("=" * 60)
    print(" MILITARY UAV COMMAND & CONTROL SYSTEM")
    print(" CLASSIFIED - AUTHORIZED PERSONNEL ONLY")
    print("=" * 60)
    print(f" Access dashboard at: http://localhost:5000")
    print()
    print(" Demo Accounts:")
    print("   Commander: commander / password123")
    print("   Operator:  operator  / password123")
    print("   Analyst:   analyst   / password123")
    print("=" * 60)
    
    # Run Flask-SocketIO
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)