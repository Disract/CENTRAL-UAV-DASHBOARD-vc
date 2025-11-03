from typing import Dict, Optional
from models.uav import UAV, UAVType

class UAVSimulator:
    def __init__(self):
        self.uavs: Dict[str, UAV] = {}
    
    def add_uav(self, uav_id: str, uav_type: UAVType, home_lat: float, home_lon: float, model: str = "Unknown") -> UAV:
        uav = UAV(uav_id, uav_type, home_lat, home_lon, model)
        self.uavs[uav_id] = uav
        return uav
    
    def get_uav(self, uav_id: str) -> Optional[UAV]:
        return self.uavs.get(uav_id)
    
    def remove_uav(self, uav_id: str) -> bool:
        if uav_id in self.uavs:
            del self.uavs[uav_id]
            return True
        return False
    
    def update_all_uavs(self):
        for uav in self.uavs.values():
            uav.update()
    
    def toggle_uav_pause(self, uav_id: str) -> bool:
        uav = self.get_uav(uav_id)
        if uav:
            if uav.paused:
                uav.resume()
            else:
                uav.pause()
            return True
        return False
    
    def kill_uav(self, uav_id: str) -> bool:
        uav = self.get_uav(uav_id)
        if uav:
            uav.kill()
            return True
        return False
    
    def return_to_base(self, uav_id: str) -> bool:
        uav = self.get_uav(uav_id)
        if uav:
            uav.return_to_base()
            return True
        return False
