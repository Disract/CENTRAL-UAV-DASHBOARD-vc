from enum import Enum
from dataclasses import dataclass

class UserRole(Enum):
    COMMANDER = "commander"
    OPERATOR = "operator"
    ANALYST = "analyst"

@dataclass
class User:
    username: str
    name: str
    role: UserRole
    password: str  # In production, this would be hashed
    
    def has_permission(self, action: str) -> bool:
        """Check if user has permission for specific action"""
        permissions = {
            UserRole.COMMANDER: ['all'],
            UserRole.OPERATOR: ['control_uav', 'view_feeds', 'create_waypoints'],
            UserRole.ANALYST: ['view_data', 'view_feeds', 'generate_reports']
        }
        
        user_perms = permissions.get(self.role, [])
        return 'all' in user_perms or action in user_perms
    
    def to_dict(self):
        return {
            'username': self.username,
            'name': self.name,
            'role': self.role.value
        }
