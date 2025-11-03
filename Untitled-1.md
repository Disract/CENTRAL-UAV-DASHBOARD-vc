---
marp: true
theme: default
class: lead
paginate: true
backgroundColor: #ffffff
color: #000000
style: |
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
  
  section {
    background: #ffffff;
    font-family: 'Space Grotesk', 'SF Pro Display', -apple-system, system-ui, sans-serif;
    font-weight: 400;
  }
  h1 { 
    color: #000000; 
    font-size: 2.2em; 
    margin-bottom: 0.5em; 
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  h2 { 
    color: #666666; 
    font-size: 1.4em; 
    margin-bottom: 0.8em; 
    font-weight: 500;
  }
  h3 { 
    color: #000000; 
    font-size: 1.2em; 
    font-weight: 600;
  }
  li { 
    margin: 0.3em 0; 
    font-size: 1.1em; 
    color: #333333;
  }
  code { 
    background: #f5f5f5; 
    color: #000000;
    padding: 0.2em 0.4em; 
    border-radius: 4px; 
    font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
    font-size: 0.9em;
    border: 1px solid #e0e0e0;
  }
  pre {
    background: #f8f8f8;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1em;
    font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
  }
  table { 
    width: 100%; 
    margin: 1em 0; 
    border-collapse: collapse;
    border: 1px solid #e0e0e0;
  }
  th { 
    background: #f5f5f5; 
    padding: 0.8em; 
    border: 1px solid #e0e0e0;
    font-weight: 600;
  }
  td { 
    padding: 0.8em; 
    border: 1px solid #e0e0e0; 
    color: #333333;
  }
  .columns { display: flex; gap: 2em; }
  .col { flex: 1; }
  strong { font-weight: 600; color: #000000; }
  footer { color: #999999; font-size: 0.8em; }
---

# Centralised UAV Monitoring and Control System

## Flask + Leaflet.js Implementation

**Real-time Multi-Vehicle Surveillance Platform**

---

# System Overview

## Core Architecture

- **Centralised control** for multiple UAVs (rotary & fixed-wing)
- **Real-time tracking** and route management
- **Software-synthesised telemetry** simulation
- **Return-to-base** mission completion

---
## Project Structure Overview

This project follows the typical Flask application structure:

- **app.py** → Main Python backend (Flask server, routes, and data handling).
- **templates/** → HTML files rendered by Flask (frontend layout and UI).
- **static/** → CSS, JavaScript, and image files for styling and interactivity.
- **service/** →  python modules.
- **requirements.txt** → Python dependencies.

---
# Technical Stack

## Backend & Frontend

- **Flask (Python)** - RESTful API server
- **Leaflet.js** - Interactive mapping frontend  
- **WebSocket** connections for real-time updates

---
## How Flask Serves the Webpage
1. **Flask Route**:  
   - `@app.route('/')` handles requests to the home page.

2. **Template Rendering**:  
   - This HTML file can use Jinja2 template syntax (`{{ variable }}`) to insert Python values.

3. **Static Assets**:  
   - CSS and JS files are linked with `{{ url_for('static', filename='path/to/file') }}`.
---
# Flask Backend Architecture

## Core Components

- **API endpoints** for UAV telemetry data
- **Route calculation** and mission planning
- **Real-time data processing** engine
- **Database integration** for flight logs
- **WebSocket handler** for live updates

---

# Leaflet API Example

```javascript
    initMap() {
         // centered on VIT-CENNNNNAI
       this.map = L.map('map').setView([12.8406, 80.1530], 15); 
        
        // Add custom zoom control
        L.control.zoom({
            position: 'bottomleft'
        }).addTo(this.map);
        
```

---

# Leaflet.js Frontend

## Mapping Capabilities

- **Interactive pan/zoom** controls
- **Real-time marker updates** via WebSocket
- **Flight path visualization** with route lines  
- **Multiple map layers** (satellite, terrain)
- **Status overlays** and alert notifications

---

# Software-Synthesised Telemetry

## Simulation Engine

- **Physics-based movement** algorithms
- **Realistic flight dynamics** modeling
- **Mission lifecycle** automation
- **Return-to-base** path calculation

---

# Telemetry Generation Process

```python
def generate_telemetry_update(uav):
    next_waypoint = uav.get_next_waypoint()
    new_position = simulate_movement(
        current_pos=uav.position,
        target_pos=next_waypoint,
        speed=uav.max_speed * 0.8,
        time_delta=1.0
    )
    return {
        'position': new_position,
        'battery': simulate_battery_drain(uav),
        'sensors': generate_sensor_data(new_position)
    }
```

---

# Multi-Vehicle Support

## Rotary Wing (Drones)

- **Vertical takeoff/landing** capability
- **Hovering** for stationary monitoring
- **High maneuverability** in tight spaces
- **Flight time:** 15-30 minutes typical

---

# Multi-Vehicle Support

## Fixed-Wing Aircraft

- **Extended flight range** and endurance
- **Higher operational altitude** coverage
- **Faster cruise speeds** for area patrol
- **Larger payload capacity** for sensors

---

# Mass Surveillance Applications

## Event Monitoring

- **Concert/festival** crowd safety monitoring
- **Sports events** security perimeter coverage
- **Public gatherings** traffic flow management
- **Emergency response** disaster assessment

---

# Coordination Features

## Fleet Management

- **Multi-UAV formation** flying patterns
- **Automated coverage** grid generation
- **Real-time data aggregation** from all units
- **Centralized command** and control interface

---

# Centralised vs Decentralised

## Architecture Comparison

<div class="columns">
<div class="col">

### Centralised Benefits
- **Unified data** repository
- **Superior coordination** 
- **Easier scaling**
- **Lower hardware costs**

</div>
<div class="col">

### Centralised Drawbacks
- **Single point of failure**
- **Network latency** issues
- **Bandwidth limitations**
- **Central server dependency**

</div>
</div>

---

# System Benefits

## Operational Advantages

- **Simplified control** through single interface
- **Consolidated data** analytics and reporting
- **Cost-effective** hardware deployment
- **Standardized** mission planning workflow

---

# Implementation Challenges

## Technical Constraints

- **Network connectivity** requirements
- **Scalability limits** with large fleets
- **Real-time performance** under load
- **Data synchronization** complexity

---

# Deployment Requirements

## Infrastructure Needs

- **Flask application server** (cloud or on-premise)
- **Database system** for persistent storage
- **Network infrastructure** for UAV communication
- **Web server** for frontend delivery

---

# Real-World Use Cases

## Practical Applications

- **Border patrol** and perimeter security
- **Search and rescue** operations
- **Environmental monitoring** missions
- **Infrastructure inspection** programs

---

# Future Improvements

## Advanced Capabilities

- **Neural networks** for autonomous decision-making
- **Computer vision** and video processing
- **SLAM algorithms** for autonomous navigation
- **Machine learning** for predictive maintenance

---

# Project Implementation

## Development Roadmap

1. **Flask backend** development and API design
2. **Leaflet.js frontend** integration and testing
3. **Telemetry simulation** engine implementation
4. **Multi-UAV coordination** system deployment
5. **Performance optimization** and scaling

---

# Conclusion

## System Summary

**Centralised UAV monitoring** provides practical benefits for:
- **Fleet coordination** and mission management
- **Real-time surveillance** applications
- **Cost-effective** multi-vehicle operations
- **Scalable deployment** across various scenarios

**Flask + Leaflet.js** offers robust, proven technology stack for professional UAV management systems.