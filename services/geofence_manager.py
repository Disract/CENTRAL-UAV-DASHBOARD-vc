from typing import List, Dict, Any, Tuple
import uuid

class Geofence:
    def __init__(self, fence_id: str, name: str, coordinates: List[List[float]], color: str = "red"):
        self.id = fence_id
        self.name = name
        self.coordinates = coordinates  # List of [lat, lon] pairs
        self.color = color
        self.active = True
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'coordinates': self.coordinates,
            'color': self.color,
            'active': self.active
        }

class GeofenceManager:
    def __init__(self):
        self.geofences: Dict[str, Geofence] = {}
    
    def add_geofence(self, fence_id: str, name: str, coordinates: List[List[float]], color: str = "red"):
        """Add a new geofence"""
        geofence = Geofence(fence_id, name, coordinates, color)
        self.geofences[fence_id] = geofence
        return fence_id
    
    def get_all_geofences(self) -> List[Dict[str, Any]]:
        """Get all geofences"""
        return [fence.to_dict() for fence in self.geofences.values() if fence.active]
    
    def check_violation(self, lat: float, lon: float) -> bool:
        """Check if coordinates violate any geofence"""
        for geofence in self.geofences.values():
            if geofence.active and self._point_in_polygon(lat, lon, geofence.coordinates):
                return True
        return False
    
    def _point_in_polygon(self, lat: float, lon: float, polygon: List[List[float]]) -> bool:
        """Check if point is inside polygon using ray casting algorithm"""
        x, y = lon, lat
        n = len(polygon)
        inside = False
        
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
