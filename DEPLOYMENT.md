# Military UAV Dashboard - Deployment Guide

## 🚁 CLASSIFIED SYSTEM DEPLOYMENT

### Prerequisites
- Python 3.8 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Network access for map tiles

### Quick Start

1. **Install Dependencies**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

2. **Run the Application**
   \`\`\`bash
   python app.py
   \`\`\`

3. **Access the Dashboard**
   - Open browser to: `http://localhost:5000`
   - Use demo credentials:
     - **Commander**: `commander` / `password123`
     - **Operator**: `operator` / `password123`
     - **Analyst**: `analyst` / `password123`

### Features Overview

#### 🔒 **Security Features**
- Role-based access control (Commander, Operator, Analyst)
- Encrypted communication simulation
- Classified system authentication
- Session management

#### 🗺️ **Advanced Mapping**
- Multiple tile layers (Street, Satellite, Terrain, Dark)
- Real-time UAV tracking with military icons
- Flight path visualization
- Geofencing with no-fly zones
- Waypoint navigation display

#### 🚁 **UAV Management**
- 6 simulated military UAVs (MQ-9 Reaper, MQ-1 Predator, etc.)
- Real-time telemetry monitoring
- Mission status tracking
- Emergency controls (Pause, RTB, Kill)
- Battery and fuel monitoring

#### 📹 **Live Feeds Simulation**
- Optical and thermal camera feeds
- Video feed status monitoring
- Multi-UAV feed management
- Encrypted feed indicators

#### ⚠️ **Alert System**
- Geofence violation alerts
- Low battery warnings
- Emergency status notifications
- Real-time alert timeline

#### 📊 **Mission Control**
- Mission timeline tracking
- Command log history
- System status monitoring
- Multi-user collaboration

### System Architecture

\`\`\`
Military UAV Dashboard/
├── Flask Backend
│   ├── Real-time WebSocket communication
│   ├── REST API endpoints
│   ├── User authentication & authorization
│   └── UAV simulation engine
├── Frontend Dashboard
│   ├── Bootstrap 5 military styling
│   ├── Leaflet.js mapping
│   ├── Real-time data visualization
│   └── Responsive design
└── Services
    ├── UAV Simulator
    ├── Mission Manager
    ├── Geofence Manager
    └── Video Feed Manager
\`\`\`

### Production Deployment

#### Environment Variables
\`\`\`bash
export FLASK_ENV=production
export SECRET_KEY=your-secret-key-here
export DATABASE_URL=your-database-url  # For future database integration
\`\`\`

#### Docker Deployment
\`\`\`dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
\`\`\`

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
