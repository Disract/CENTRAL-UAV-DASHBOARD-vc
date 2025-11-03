import random
from typing import Dict, List, Any
from datetime import datetime

class VideoFeed:
    def __init__(self, feed_id: str, uav_id: str, feed_type: str = "optical"):
        self.id = feed_id
        self.uav_id = uav_id
        self.feed_type = feed_type  # optical, thermal, night_vision
        self.status = "active"
        self.quality = "HD"
        self.last_update = datetime.now()
        
        # Simulate feed data
        self.frame_rate = 30
        self.resolution = "1920x1080"
        self.encryption = "AES-256"
    
    def to_dict(self):
        return {
            'id': self.id,
            'uav_id': self.uav_id,
            'feed_type': self.feed_type,
            'status': self.status,
            'quality': self.quality,
            'frame_rate': self.frame_rate,
            'resolution': self.resolution,
            'encryption': self.encryption,
            'last_update': self.last_update.isoformat(),
            'thumbnail_url': f'/static/images/feed_{self.feed_type}_{random.randint(1,3)}.jpg'
        }

class VideoFeedManager:
    def __init__(self):
        self.feeds: Dict[str, VideoFeed] = {}
        self._init_demo_feeds()
    
    def _init_demo_feeds(self):
        """Initialize demo video feeds"""
        uav_ids = ["REAPER-01", "PREDATOR-02", "RAVEN-03", "WASP-04", "HAWK-05", "SHADOW-06"]
        
        for uav_id in uav_ids:
            # Optical feed
            optical_feed = VideoFeed(f"{uav_id}_optical", uav_id, "optical")
            self.feeds[optical_feed.id] = optical_feed
            
            # Thermal feed for larger UAVs
            if "REAPER" in uav_id or "PREDATOR" in uav_id or "HAWK" in uav_id:
                thermal_feed = VideoFeed(f"{uav_id}_thermal", uav_id, "thermal")
                self.feeds[thermal_feed.id] = thermal_feed
    
    def get_all_feeds(self) -> List[Dict[str, Any]]:
        """Get all video feeds"""
        return [feed.to_dict() for feed in self.feeds.values()]
    
    def update_feeds(self) -> List[Dict[str, Any]]:
        """Update feed status and return current feeds"""
        for feed in self.feeds.values():
            feed.last_update = datetime.now()
            # Simulate occasional feed issues
            if random.random() < 0.05:  # 5% chance of temporary issue
                feed.status = "degraded"
            else:
                feed.status = "active"
        
        return self.get_all_feeds()
