import cv2
import os

# Try to import ORB-SLAM3
try:
    from python_orb_slam3 import ORBExtractor
    HAS_ORB_SLAM = True
    print("✓ Using python_orb_slam3")
except ImportError:
    HAS_ORB_SLAM = False
    print("⚠ python_orb_slam3 not found, using OpenCV ORB fallback")

def process_video(video_path):
    """Process video with ORB keypoints - simple and clean"""
    
    if not os.path.exists(video_path):
        print(f"✗ Video not found: {video_path}")
        return
    
    # Initialize video capture
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"✗ Cannot open video: {video_path}")
        return
    
    # Initialize ORB extractor
    if HAS_ORB_SLAM:
        orb_extractor = ORBExtractor()
        print(f"✓ Using ORB-SLAM3 for {os.path.basename(video_path)}")
    else:
        orb_extractor = cv2.ORB_create(nfeatures=2000)
        print(f"✓ Using OpenCV ORB for {os.path.basename(video_path)}")
    
    window_name = f"ORB Keypoints - {os.path.basename(video_path)}"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    
    print("Press ESC or 'q' to quit")
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            # Loop video
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
        
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Extract keypoints and descriptors
        if HAS_ORB_SLAM:
            keypoints, descriptors = orb_extractor.detectAndCompute(gray)
        else:
            keypoints, descriptors = orb_extractor.detectAndCompute(gray, None)
        
        # Draw keypoints (small dots, not big circles)
        frame_with_keypoints = cv2.drawKeypoints(
            frame, keypoints, None, color=(0, 255, 0), flags=0
        )
        
        cv2.imshow(window_name, frame_with_keypoints)
        
        if cv2.waitKey(1) & 0xFF == 27 or cv2.waitKey(1) & 0xFF == ord('q'):  # ESC or 'q' to exit
            break
    
    cap.release()
    cv2.destroyAllWindows()


def main():
    """Main function - set your video paths here"""
    
    # Single video
    video_path = "static/videos/vid1.mp4"
    process_video(video_path)
    
    # Or process multiple videos one by one
    # video_paths = [
    #     "static/videos/vid1.mp4",
    #     "static/videos/vid2.mp4",
    #     "static/videos/vid3.mp4",
    #     "static/videos/vid4.mp4"
    # ]
    # 
    # for video in video_paths:
    #     process_video(video)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        cv2.destroyAllWindows()