# CENTRAL-UAV-DASHBOARD-vc

A centralized dashboard system for monitoring and controlling multiple UAV (Unmanned Aerial Vehicle) units in real-time.

## Overview

This project provides a web-based interface for managing multiple drones simultaneously. It displays telemetry data, flight status, and enables control commands from a single control station.

The dashboard is designed for multi-UAV operations, providing operators with a unified view of fleet status and mission parameters.

## Features

- Real-time telemetry monitoring
- Multi-UAV support
- Flight status visualization
- GPS position tracking
- Battery and sensor data display
- Control command interface
- Mission planning support

## Requirements

### Hardware
- UAV units with telemetry transmission capability
- Ground control station with network connectivity
- Compatible communication modules (WiFi, radio, or cellular)

### Software
- Python 3.8+
- Web browser (Chrome, Firefox recommended)

### Python Dependencies
```bash
pip install flask flask-socketio numpy pyserial dronekit
```

## Setup

1. Clone the repository:
```bash
git clone https://github.com/Disract/CENTRAL-UAV-DASHBOARD-vc.git
cd CENTRAL-UAV-DASHBOARD-vc
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure UAV connection parameters:
   - Update connection strings in configuration file
   - Set communication protocol (MAVLink, TCP, UDP)
   - Configure port numbers and IP addresses

4. Run the dashboard server:
```bash
python app.py
```

5. Open browser and navigate to `http://localhost:5000`

## Project Structure
```
CENTRAL-UAV-DASHBOARD-vc/
├── app.py                  # Main Flask application
├── static/                 # CSS, JavaScript, assets
│   ├── js/                # Frontend scripts
│   └── css/               # Stylesheets
├── templates/             # HTML templates
├── telemetry/             # Telemetry processing modules
├── config/                # Configuration files
└── requirements.txt       # Python dependencies
```

## Functionality

### Telemetry Display
- GPS coordinates and altitude
- Battery voltage and percentage
- Flight mode and armed status
- Heading and orientation
- Ground speed and airspeed

### Control Interface
- Arm/disarm commands
- Flight mode switching
- Waypoint navigation
- Emergency stop

### Multi-UAV Management
- Individual UAV status panels
- Fleet overview map
- Simultaneous monitoring
- Priority alerts and warnings

## Usage

1. Connect UAVs to the network
2. Start the dashboard server
3. Access the web interface
4. Monitor real-time telemetry data
5. Issue control commands as needed

## Communication Protocols

Supports:
- MAVLink protocol
- TCP/IP connections
- UDP streaming
- Serial communication

## Limitations

- Network latency affects real-time performance
- Maximum number of simultaneous UAVs depends on bandwidth
- No autonomous collision avoidance
- Requires stable network connection
- Does not replace certified flight control systems

## Safety Notes

- This system is for experimental and educational purposes
- Not certified for commercial or critical operations
- Operators must comply with local aviation regulations
- Always maintain visual line of sight with UAVs
- Test in controlled environments before field deployment

## Troubleshooting

### Connection Issues
- Verify UAV IP addresses and ports
- Check firewall settings
- Ensure telemetry modules are powered

### Data Display Problems
- Confirm MAVLink message format
- Check baud rate settings
- Verify protocol compatibility

## Notes

- Dashboard updates at configurable intervals (default 1Hz)
- Telemetry logs are stored in JSON format
- WebSocket used for real-time data streaming
- Map integration requires internet connection for tile loading


