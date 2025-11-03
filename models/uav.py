from enum import Enum
from dataclasses import dataclass
from typing import List, Tuple
import time
import math
import random

class UAVType(Enum):
    QUADCOPTER = "quadcopter"
    FIXED_WING = "fixed_wing"

class MissionStatus(Enum):
    IDLE = "idle"
    EN_ROUTE = "en_route"
    LOITERING = "loitering"
    RETURNING = "returning"
    EMERGENCY = "emergency"
    PAUSED = "paused"
    RTB = "rtb"  # Return to Base

@dataclass
class Waypoint:
    lat: float
    lon: float
    altitude: float

class UAV:
    def __init__(self, uav_id: str, uav_type: UAVType, home_lat: float, home_lon: float, model: str = "Unknown"):
        self.id = uav_id
        self.type = uav_type
        self.model = model
        self.home_lat = home_lat
        self.home_lon = home_lon
        
        # Current position
        self.lat = home_lat
        self.lon = home_lon
        self.altitude = self._get_default_altitude()
        
        # Flight characteristics
        self.max_speed = self._get_max_speed()
        self.current_speed = 0
        self.heading = 0
        
        # Enhanced military telemetry
        self.battery_level = 100.0
        self.fuel_level = 100.0 if uav_type == UAVType.FIXED_WING else 0.0
        self.mission_status = MissionStatus.IDLE
        self.paused = False
        
        # Military-specific data
        self.payload_status = "armed" if "REAPER" in uav_id or "PREDATOR" in uav_id else "surveillance"
        self.communication_status = "encrypted"
        self.threat_level = "green"
        self.last_contact = time.time()
        
        # Mission data
        self.waypoints: List[Waypoint] = []
        self.current_waypoint_index = 0
        self.path_history: List[Tuple[float, float]] = [(home_lat, home_lon)]
        
        # Enhanced sensors
        self.sensors = {
            'gps': 'active',
            'radar': 'active' if uav_type == UAVType.FIXED_WING else 'n/a',
            'camera': 'active',
            'thermal': 'active' if "REAPER" in uav_id or "PREDATOR" in uav_id else 'n/a',
            'lidar': 'active' if uav_type == UAVType.QUADCOPTER else 'n/a'
        }
        
        self.last_update = time.time()
        self._generate_mission()
    
    def _get_default_altitude(self) -> float:
        if self.type == UAVType.QUADCOPTER:
            return 100 + (hash(self.id) % 200)  # 100-300m
        else:
            return 1000 + (hash(self.id) % 2000)  # 1000-3000m
    
    def _get_max_speed(self) -> float:
        if self.type == UAVType.QUADCOPTER:
            return 20 + (hash(self.id) % 15)  # 20-35 m/s
        else:
            return 80 + (hash(self.id) % 40)  # 80-120 m/s
    
    def _generate_mission(self):
        random.seed(hash(self.id))
        
        if self.type == UAVType.QUADCOPTER:
            num_waypoints = random.randint(4, 8)
            max_distance = 0.02  # ~2km radius
        else:
            num_waypoints = random.randint(6, 12)
            max_distance = 0.1  # ~10km radius
        
        self.waypoints = []
        for i in range(num_waypoints):
            angle = (2 * math.pi * i / num_waypoints) + random.uniform(-0.3, 0.3)
            distance = random.uniform(max_distance * 0.4, max_distance)
            
            lat_offset = distance * math.cos(angle)
            lon_offset = distance * math.sin(angle)
            
            waypoint = Waypoint(
                lat=self.home_lat + lat_offset,
                lon=self.home_lon + lon_offset,
                altitude=self.altitude + random.uniform(-100, 200)
            )
            self.waypoints.append(waypoint)
        
        self.mission_status = MissionStatus.EN_ROUTE
    
    def update(self):
        if self.paused or self.mission_status == MissionStatus.EMERGENCY:
            return
        
        current_time = time.time()
        dt = current_time - self.last_update
        self.last_update = current_time
        self.last_contact = current_time
        
        # Update battery and fuel
        consumption_rate = 0.15 if self.current_speed > 0 else 0.03
        self.battery_level = max(0, self.battery_level - consumption_rate * dt)
        
        if self.fuel_level > 0:
            fuel_consumption = 0.1 if self.current_speed > 0 else 0.02
            self.fuel_level = max(0, self.fuel_level - fuel_consumption * dt)
        
        # Emergency conditions
        if self.battery_level < 15 or (self.fuel_level > 0 and self.fuel_level < 10):
            self.mission_status = MissionStatus.EMERGENCY
            self.threat_level = "red"
            self.current_speed = 0
            return
        
        # Update threat level based on battery
        if self.battery_level < 30:
            self.threat_level = "yellow"
        else:
            self.threat_level = "green"
        
        # Handle mission states
        if self.mission_status == MissionStatus.EN_ROUTE:
            self._move_to_waypoint(dt)
        elif self.mission_status in [MissionStatus.RETURNING, MissionStatus.RTB]:
            self._return_home(dt)
        elif self.mission_status == MissionStatus.LOITERING:
            self._loiter(dt)
    
    def _move_to_waypoint(self, dt: float):
        if self.current_waypoint_index >= len(self.waypoints):
            self.mission_status = MissionStatus.RETURNING
            return
        
        target = self.waypoints[self.current_waypoint_index]
        distance = self._calculate_distance(self.lat, self.lon, target.lat, target.lon)
        
        if distance < 50:  # 50m threshold
            self.current_waypoint_index += 1
            if self.current_waypoint_index >= len(self.waypoints):
                self.mission_status = MissionStatus.RETURNING
            return
        
        self._move_towards_target(target.lat, target.lon, target.altitude, dt)
    
    def _return_home(self, dt: float):
        distance = self._calculate_distance(self.lat, self.lon, self.home_lat, self.home_lon)
        
        if distance < 50:  # 50m threshold
            self.mission_status = MissionStatus.IDLE
            self.current_speed = 0
            self.current_waypoint_index = 0
            # Generate new mission after brief pause
            if random.random() < 0.1:  # 10% chance per update
                self._generate_mission()
            return
        
        self._move_towards_target(self.home_lat, self.home_lon, self._get_default_altitude(), dt)
    
    def _loiter(self, dt: float):
        self.current_speed = self.max_speed * 0.3
        # Simple circular loiter pattern
        self.heading = (self.heading + 2) % 360
    
    def _move_towards_target(self, target_lat: float, target_lon: float, target_alt: float, dt: float):
        self.heading = self._calculate_bearing(self.lat, self.lon, target_lat, target_lon)
        
        # Set realistic speed
        if self.type == UAVType.QUADCOPTER:
            self.current_speed = self.max_speed * 0.8
        else:
            self.current_speed = self.max_speed * 0.9
        
        # Calculate movement
        distance_to_move = self.current_speed * dt
        bearing_rad = math.radians(self.heading)
        
        # Convert to lat/lon movement
        lat_movement = distance_to_move * math.cos(bearing_rad) / 111000
        lon_movement = distance_to_move * math.sin(bearing_rad) / (111000 * math.cos(math.radians(self.lat)))
        
        self.lat += lat_movement
        self.lon += lon_movement
        
        # Gradual altitude adjustment
        alt_diff = target_alt - self.altitude
        self.altitude += alt_diff * 0.05
        
        # Update path history
        self.path_history.append((self.lat, self.lon))
        if len(self.path_history) > 200:
            self.path_history.pop(0)
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat/2) * math.sin(delta_lat/2) +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon/2) * math.sin(delta_lon/2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def _calculate_bearing(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lon = math.radians(lon2 - lon1)
        
        y = math.sin(delta_lon) * math.cos(lat2_rad)
        x = (math.cos(lat1_rad) * math.sin(lat2_rad) -
             math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon))
        
        bearing = math.atan2(y, x)
        return (math.degrees(bearing) + 360) % 360
    
    def pause(self):
        self.paused = True
        self.mission_status = MissionStatus.PAUSED
        self.current_speed = 0
    
    def resume(self):
        self.paused = False
        if self.mission_status == MissionStatus.PAUSED:
            self.mission_status = MissionStatus.EN_ROUTE
    
    def kill(self):
        self.mission_status = MissionStatus.EMERGENCY
        self.current_speed = 0
        self.threat_level = "red"
    
    def return_to_base(self):
        self.mission_status = MissionStatus.RTB
        self.current_waypoint_index = 0
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'type': self.type.value,
            'model': self.model,
            'lat': round(self.lat, 6),
            'lon': round(self.lon, 6),
            'altitude': round(self.altitude, 1),
            'speed': round(self.current_speed, 1),
            'heading': round(self.heading, 1),
            'battery_level': round(self.battery_level, 1),
            'fuel_level': round(self.fuel_level, 1),
            'mission_status': self.mission_status.value,
            'paused': self.paused,
            'payload_status': self.payload_status,
            'communication_status': self.communication_status,
            'threat_level': self.threat_level,
            'last_contact': self.last_contact,
            'sensors': self.sensors,
            'home_lat': self.home_lat,
            'home_lon': self.home_lon,
            'path_history': self.path_history[-100:],
            'waypoints': [(wp.lat, wp.lon) for wp in self.waypoints],
            'current_waypoint': self.current_waypoint_index
        }
