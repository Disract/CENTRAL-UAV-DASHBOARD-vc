import uuid
from datetime import datetime
from typing import List, Dict, Any

class Mission:
    def __init__(self, mission_id: str, name: str, description: str, uav_ids: List[str], created_by: str):
        self.id = mission_id
        self.name = name
        self.description = description
        self.uav_ids = uav_ids
        self.created_by = created_by
        self.created_at = datetime.now()
        self.status = "active"
        self.waypoints = []
        
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'uav_ids': self.uav_ids,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'status': self.status,
            'waypoints': self.waypoints
        }

class MissionManager:
    def __init__(self):
        self.missions: Dict[str, Mission] = {}
        self.mission_logs: List[Dict[str, Any]] = []
        
        # Initialize with demo missions
        self._init_demo_missions()
    
    def _init_demo_missions(self):
        """Initialize with demo missions"""
        mission1 = Mission(
            str(uuid.uuid4()),
            "Operation Desert Watch",
            "Surveillance mission over designated area",
            ["REAPER-01", "PREDATOR-02"],
            "Commander Alpha"
        )
        self.missions[mission1.id] = mission1
        
        mission2 = Mission(
            str(uuid.uuid4()),
            "Urban Reconnaissance",
            "City surveillance and threat assessment",
            ["RAVEN-03", "WASP-04"],
            "Commander Alpha"
        )
        self.missions[mission2.id] = mission2
    
    def create_mission(self, name: str, description: str, uav_ids: List[str], created_by: str) -> str:
        """Create a new mission"""
        mission_id = str(uuid.uuid4())
        mission = Mission(mission_id, name, description, uav_ids, created_by)
        self.missions[mission_id] = mission
        
        self.add_log_entry(f"Mission '{name}' created by {created_by}")
        return mission_id
    
    def get_mission(self, mission_id: str) -> Mission:
        """Get mission by ID"""
        return self.missions.get(mission_id)
    
    def get_all_missions(self) -> List[Dict[str, Any]]:
        """Get all missions"""
        return [mission.to_dict() for mission in self.missions.values()]
    
    def add_log_entry(self, message: str, level: str = "info"):
        """Add entry to mission log"""
        log_entry = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'message': message,
            'level': level
        }
        self.mission_logs.append(log_entry)
        
        # Keep only last 100 entries
        if len(self.mission_logs) > 100:
            self.mission_logs.pop(0)
    
    def get_mission_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent mission logs"""
        return self.mission_logs[-limit:]
