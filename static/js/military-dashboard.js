class MilitaryUAVDashboard {
    constructor() {
        this.map = null;
        this.socket = null;
        this.uavMarkers = new Map();
        this.uavPaths = new Map();
        this.geofences = new Map();
        this.showPaths = true;
        this.currentLayer = 'dark';
        this.alerts = [];
        this.missionLogs = [];
        
        this.init();
    }
    
    init() {
        this.initMap();
        this.initSocket();
        this.initEventListeners();
        this.startSystemClock();
    }
    
    initMap() {
        // Initialize map with military styling
       // Initialize Leaflet map centered on NYC
       this.map = L.map('map').setView([12.8406, 80.1530], 15); 
        
        // Add custom zoom control
        L.control.zoom({
            position: 'bottomleft'
        }).addTo(this.map);
        
        // Define tile layers
        this.tileLayers = {
            dark: L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
                attribution: 'Military Command System'
            }),
            street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'Military Command System'
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Military Command System'
            }),
            terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Military Command System'
            })
        };
        
        // Set default layer
        this.tileLayers[this.currentLayer].addTo(this.map);
    }
    
    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('🔒 SECURE CONNECTION ESTABLISHED');
            this.updateSystemStatus('COMMS', 'ENCRYPTED', 'encrypted');
        });
        
        this.socket.on('disconnect', () => {
            console.log('⚠️ CONNECTION LOST');
            this.updateSystemStatus('COMMS', 'OFFLINE', 'offline');
        });
        
        this.socket.on('uav_data', (data) => {
            this.updateUAVs(data);
        });
        
        this.socket.on('uav_update', (data) => {
            this.updateUAVs(data);
        });
        
        this.socket.on('mission_data', (data) => {
            this.updateMissions(data);
        });
        
        this.socket.on('geofence_data', (data) => {
            this.updateGeofences(data);
        });
        
        this.socket.on('alerts', (alerts) => {
            this.handleAlerts(alerts);
        });
        
        this.socket.on('video_update', (feeds) => {
            this.updateVideoFeeds(feeds);
        });
    }
    
    initEventListeners() {
        // Map controls
        document.getElementById('center-map').addEventListener('click', () => {
            this.centerMapOnUAVs();
        });
        
        document.getElementById('toggle-paths').addEventListener('click', () => {
            this.togglePaths();
        });
        
        // Layer switching
        document.querySelectorAll('[data-layer]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchLayer(e.target.dataset.layer);
            });
        });
        
        // Mission form
        document.getElementById('new-mission-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createMission();
        });
    }
    
    startSystemClock() {
        setInterval(() => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { 
                hour12: false,
                timeZone: 'UTC'
            });
            
            // Update any time displays
            document.querySelectorAll('.system-time').forEach(el => {
                el.textContent = `${timeStr} UTC`;
            });
        }, 1000);
    }
    
    updateUAVs(uavs) {
        // Update active count
        const activeCount = uavs.filter(uav => 
            uav.mission_status !== 'idle' && uav.mission_status !== 'emergency'
        ).length;
        document.getElementById('active-count').textContent = activeCount;
        
        // Update map
        this.updateMapMarkers(uavs);
        
        // Update UAV cards
        this.updateUAVCards(uavs);
        
        // Add to mission timeline
        this.updateMissionTimeline(uavs);
    }
    
    updateMapMarkers(uavs) {
        // Clear existing markers
        this.uavMarkers.forEach(marker => this.map.removeLayer(marker));
        this.uavPaths.forEach(path => this.map.removeLayer(path));
        this.uavMarkers.clear();
        this.uavPaths.clear();
        
        uavs.forEach(uav => {
            // Create military-style icon
            const iconHtml = this.createUAVIcon(uav);
            const icon = L.divIcon({
                html: iconHtml,
                className: 'military-uav-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            // Create marker
            const marker = L.marker([uav.lat, uav.lon], { icon })
                .bindPopup(this.createMilitaryPopup(uav))
                .addTo(this.map);
            
            // Add click handler
            marker.on('click', () => {
                this.showUAVDetails(uav);
            });
            
            this.uavMarkers.set(uav.id, marker);
            
            // Add flight path
            if (this.showPaths && uav.path_history && uav.path_history.length > 1) {
                const pathColor = this.getUAVColor(uav);
                const path = L.polyline(uav.path_history, {
                    color: pathColor,
                    weight: 2,
                    opacity: 0.8,
                    dashArray: uav.mission_status === 'emergency' ? '10, 5' : null
                }).addTo(this.map);
                
                this.uavPaths.set(uav.id, path);
            }
            
            // Add waypoints for active missions
            if (uav.waypoints && uav.mission_status === 'en_route') {
                uav.waypoints.forEach((waypoint, index) => {
                    const waypointIcon = L.divIcon({
                        html: `<div class="waypoint-marker">${index + 1}</div>`,
                        className: 'military-waypoint',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    
                    L.marker([waypoint[0], waypoint[1]], { icon: waypointIcon })
                        .bindPopup(`Waypoint ${index + 1} - ${uav.id}`)
                        .addTo(this.map);
                });
            }
        });
    }
    
    createUAVIcon(uav) {
        const color = this.getUAVColor(uav);
        const typeIcon = uav.type === 'quadcopter' ? '🚁' : '✈️';
        const statusClass = `threat-${uav.threat_level}`;
        
        return `
            <div class="uav-icon ${statusClass}" style="color: ${color};">
                <div class="uav-symbol">${typeIcon}</div>
                <div class="uav-id-label">${uav.id}</div>
                ${uav.mission_status === 'emergency' ? '<div class="emergency-blink">⚠️</div>' : ''}
            </div>
        `;
    }
    
    createMilitaryPopup(uav) {
        const batteryClass = this.getBatteryClass(uav.battery_level);
        const threatClass = `threat-${uav.threat_level}`;
        
        return `
            <div class="military-popup">
                <div class="popup-header">
                    <strong>${uav.id}</strong>
                    <span class="classification-mini">CLASSIFIED</span>
                </div>
                <div class="popup-content">
                    <div class="popup-row">
                        <span>Model:</span> <span>${uav.model}</span>
                    </div>
                    <div class="popup-row">
                        <span>Position:</span> <span>${uav.lat.toFixed(4)}, ${uav.lon.toFixed(4)}</span>
                    </div>
                    <div class="popup-row">
                        <span>Altitude:</span> <span>${uav.altitude}m</span>
                    </div>
                    <div class="popup-row">
                        <span>Speed:</span> <span>${uav.speed} m/s</span>
                    </div>
                    <div class="popup-row">
                        <span>Battery:</span> <span class="${batteryClass}">${uav.battery_level}%</span>
                    </div>
                    <div class="popup-row">
                        <span>Threat Level:</span> <span class="${threatClass}">${uav.threat_level.toUpperCase()}</span>
                    </div>
                    <div class="popup-row">
                        <span>Status:</span> <span>${uav.mission_status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    updateUAVCards(uavs) {
        const container = document.getElementById('uav-cards');
        container.innerHTML = '';
        
        uavs.forEach(uav => {
            const card = this.createUAVCard(uav);
            container.appendChild(card);
        });
    }
    
    createUAVCard(uav) {
        const card = document.createElement('div');
        card.className = 'uav-card';
        card.onclick = () => this.showUAVDetails(uav);
        
        const batteryClass = this.getBatteryClass(uav.battery_level);
        const threatClass = `threat-${uav.threat_level}`;
        
        card.innerHTML = `
            <div class="uav-card-header">
                <span class="uav-id">${uav.id}</span>
                <span class="uav-type type-${uav.type}">${uav.model}</span>
            </div>
            <div class="uav-telemetry">
                <div class="telemetry-item">
                    <span class="telemetry-label">Speed:</span>
                    <span class="telemetry-value">${uav.speed} m/s</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Altitude:</span>
                    <span class="telemetry-value">${uav.altitude}m</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Battery:</span>
                    <span class="telemetry-value ${batteryClass}">${uav.battery_level}%</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Threat:</span>
                    <span class="telemetry-value ${threatClass}">${uav.threat_level.toUpperCase()}</span>
                </div>
            </div>
            <div class="uav-status status-${uav.mission_status}">
                ${uav.mission_status.replace('_', ' ').toUpperCase()}
            </div>
            <div class="uav-controls">
                <button class="uav-control-btn pause-btn" onclick="event.stopPropagation(); sendUAVCommand('${uav.id}', 'pause')">
                    ${uav.paused ? 'RESUME' : 'PAUSE'}
                </button>
                <button class="uav-control-btn rtb-btn" onclick="event.stopPropagation(); sendUAVCommand('${uav.id}', 'rtb')">
                    RTB
                </button>
                <button class="uav-control-btn kill-btn" onclick="event.stopPropagation(); sendUAVCommand('${uav.id}', 'kill')">
                    KILL
                </button>
            </div>
        `;
        
        return card;
    }
    
    updateGeofences(geofences) {
        // Clear existing geofences
        this.geofences.forEach(fence => this.map.removeLayer(fence));
        this.geofences.clear();
        
        geofences.forEach(geofence => {
            const polygon = L.polygon(geofence.coordinates, {
                color: geofence.color,
                fillColor: geofence.color,
                fillOpacity: 0.2,
                weight: 2,
                dashArray: '10, 5'
            }).bindPopup(`
                <div class="geofence-popup">
                    <strong>RESTRICTED AIRSPACE</strong><br>
                    <strong>Zone:</strong> ${geofence.name}<br>
                    <strong>ID:</strong> ${geofence.id}<br>
                    <span class="warning-text">⚠️ NO-FLY ZONE ⚠️</span>
                </div>
            `).addTo(this.map);
            
            this.geofences.set(geofence.id, polygon);
        });
    }
    
    updateVideoFeeds(feeds) {
        const container = document.getElementById('video-feeds');
        container.innerHTML = '';
        
        feeds.slice(0, 4).forEach(feed => { // Show only first 4 feeds
            const feedElement = document.createElement('div');
            feedElement.className = 'video-feed';
            
            feedElement.innerHTML = `
                <div class="feed-thumbnail">
                    <i class="fas fa-video"></i>
                </div>
                <div class="feed-info">
                    <div class="feed-title">${feed.uav_id} - ${feed.feed_type.toUpperCase()}</div>
                    <div class="feed-status">
                        <span class="status-indicator ${feed.status}"></span>
                        ${feed.status.toUpperCase()} | ${feed.quality}
                    </div>
                </div>
            `;
            
            container.appendChild(feedElement);
        });
    }
    
    handleAlerts(alerts) {
        const container = document.getElementById('alerts-container');
        
        alerts.forEach(alert => {
            // Add to alerts array
            this.alerts.unshift(alert);
            
            // Create alert element
            const alertElement = document.createElement('div');
            alertElement.className = `alert-item alert-${alert.severity}`;
            
            alertElement.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div class="alert-content">
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</div>
                </div>
            `;
            
            container.insertBefore(alertElement, container.firstChild);
            
            // Add to mission log
            this.addMissionLogEntry(`ALERT: ${alert.message}`, 'warning');
        });
        
        // Keep only last 10 alerts
        while (container.children.length > 10) {
            container.removeChild(container.lastChild);
        }
        
        // Limit alerts array
        this.alerts = this.alerts.slice(0, 50);
    }
    
    updateMissionTimeline(uavs) {
        // Add significant events to timeline
        uavs.forEach(uav => {
            if (uav.mission_status === 'emergency' && !this.hasRecentTimelineEntry(uav.id, 'emergency')) {
                this.addTimelineEntry(`${uav.id} EMERGENCY STATUS`, 'high');
            }
            if (uav.battery_level < 20 && !this.hasRecentTimelineEntry(uav.id, 'low_battery')) {
                this.addTimelineEntry(`${uav.id} Low Battery: ${uav.battery_level}%`, 'medium');
            }
        });
    }
    
    addTimelineEntry(message, severity = 'info') {
        const container = document.getElementById('mission-timeline');
        const entry = document.createElement('div');
        entry.className = 'timeline-entry';
        
        const now = new Date();
        entry.innerHTML = `
            <div class="timeline-time">${now.toLocaleTimeString()}</div>
            <div class="timeline-event">${message}</div>
        `;
        
        container.insertBefore(entry, container.firstChild);
        
        // Keep only last 20 entries
        while (container.children.length > 20) {
            container.removeChild(container.lastChild);
        }
    }
    
    addMissionLogEntry(message, level = 'info') {
        const container = document.getElementById('mission-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const now = new Date();
        entry.innerHTML = `
            <div class="log-timestamp">${now.toLocaleTimeString()}</div>
            <div class="log-message">${message}</div>
        `;
        
        container.insertBefore(entry, container.firstChild);
        
        // Keep only last 15 entries
        while (container.children.length > 15) {
            container.removeChild(container.lastChild);
        }
    }
    
    hasRecentTimelineEntry(uavId, eventType) {
        const container = document.getElementById('mission-timeline');
        const recentEntries = Array.from(container.children).slice(0, 5);
        return recentEntries.some(entry => 
            entry.textContent.includes(uavId) && entry.textContent.toLowerCase().includes(eventType)
        );
    }
    
    showUAVDetails(uav) {
        const modal = new bootstrap.Modal(document.getElementById('uavModal'));
        const modalBody = document.getElementById('uav-modal-body');
        
        const batteryClass = this.getBatteryClass(uav.battery_level);
        const threatClass = `threat-${uav.threat_level}`;
        
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-warning">AIRCRAFT IDENTIFICATION</h6>
                    <table class="table table-dark table-sm">
                        <tr><td>Call Sign:</td><td class="text-info">${uav.id}</td></tr>
                        <tr><td>Model:</td><td>${uav.model}</td></tr>
                        <tr><td>Type:</td><td>${uav.type.replace('_', ' ').toUpperCase()}</td></tr>
                        <tr><td>Payload:</td><td class="text-warning">${uav.payload_status.toUpperCase()}</td></tr>
                    </table>
                    
                    <h6 class="text-warning mt-3">POSITION & NAVIGATION</h6>
                    <table class="table table-dark table-sm">
                        <tr><td>Latitude:</td><td>${uav.lat.toFixed(6)}°</td></tr>
                        <tr><td>Longitude:</td><td>${uav.lon.toFixed(6)}°</td></tr>
                        <tr><td>Altitude:</td><td>${uav.altitude}m MSL</td></tr>
                        <tr><td>Heading:</td><td>${uav.heading}° True</td></tr>
                        <tr><td>Ground Speed:</td><td>${uav.speed} m/s</td></tr>
                    </table>
                </div>
                
                <div class="col-md-6">
                    <h6 class="text-warning">SYSTEM STATUS</h6>
                    <table class="table table-dark table-sm">
                        <tr><td>Mission Status:</td><td class="status-${uav.mission_status}">${uav.mission_status.replace('_', ' ').toUpperCase()}</td></tr>
                        <tr><td>Threat Level:</td><td class="${threatClass}">${uav.threat_level.toUpperCase()}</td></tr>
                        <tr><td>Battery:</td><td class="${batteryClass}">${uav.battery_level}%</td></tr>
                        <tr><td>Fuel:</td><td>${uav.fuel_level}%</td></tr>
                        <tr><td>Comms:</td><td class="text-success">${uav.communication_status.toUpperCase()}</td></tr>
                    </table>
                    
                    <h6 class="text-warning mt-3">SENSORS</h6>
                    <table class="table table-dark table-sm">
                        ${Object.entries(uav.sensors).map(([sensor, status]) => 
                            `<tr><td>${sensor.toUpperCase()}:</td><td class="${status === 'active' ? 'text-success' : 'text-muted'}">${status.toUpperCase()}</td></tr>`
                        ).join('')}
                    </table>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-12">
                    <h6 class="text-warning">MISSION CONTROL</h6>
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-outline-warning" onclick="sendUAVCommand('${uav.id}', 'pause')">
                            ${uav.paused ? 'RESUME' : 'PAUSE'} MISSION
                        </button>
                        <button class="btn btn-outline-info" onclick="sendUAVCommand('${uav.id}', 'rtb')">
                            RETURN TO BASE
                        </button>
                        <button class="btn btn-outline-danger" onclick="sendUAVCommand('${uav.id}', 'kill')">
                            EMERGENCY STOP
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.show();
    }
    
    switchLayer(layerName) {
        if (this.tileLayers[layerName]) {
            // Remove current layer
            this.map.removeLayer(this.tileLayers[this.currentLayer]);
            
            // Add new layer
            this.tileLayers[layerName].addTo(this.map);
            this.currentLayer = layerName;
            
            this.addMissionLogEntry(`Map layer switched to ${layerName.toUpperCase()}`);
        }
    }
    
    togglePaths() {
        this.showPaths = !this.showPaths;
        const button = document.getElementById('toggle-paths');
        
        if (this.showPaths) {
            button.innerHTML = '<i class="fas fa-route"></i> HIDE PATHS';
        } else {
            button.innerHTML = '<i class="fas fa-route"></i> SHOW PATHS';
            // Remove all paths
            this.uavPaths.forEach(path => this.map.removeLayer(path));
            this.uavPaths.clear();
        }
    }
    
    centerMapOnUAVs() {
        if (this.uavMarkers.size === 0) return;
        
        const group = new L.featureGroup(Array.from(this.uavMarkers.values()));
        this.map.fitBounds(group.getBounds().pad(0.1));
        
        this.addMissionLogEntry('Map centered on active UAVs');
    }
    
    updateSystemStatus(component, status, statusClass) {
        const statusElements = document.querySelectorAll(`[data-component="${component}"]`);
        statusElements.forEach(el => {
            el.textContent = status;
            el.className = `status-value ${statusClass}`;
        });
    }
    
    getUAVColor(uav) {
        if (uav.mission_status === 'emergency') return '#ff3838';
        if (uav.paused) return '#ff6b35';
        if (uav.threat_level === 'red') return '#ff3838';
        if (uav.threat_level === 'yellow') return '#ff6b35';
        return uav.type === 'quadcopter' ? '#00d4ff' : '#00ff41';
    }
    
    getBatteryClass(batteryLevel) {
        if (batteryLevel < 20) return 'low';
        if (batteryLevel < 50) return 'medium';
        return '';
    }
}

// Global functions for UAV commands
function sendUAVCommand(uavId, command) {
    fetch(`/api/uav/${uavId}/command`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: command })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`Command ${command} sent to ${uavId}`);
        } else {
            console.error(`Failed to send command to ${uavId}`);
        }
    })
    .catch(error => {
        console.error('Error sending command:', error);
    });
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new MilitaryUAVDashboard();
});

// Add custom CSS for map markers
const style = document.createElement('style');
style.textContent = `
    .military-uav-marker {
        background: transparent;
        border: none;
    }
    
    .uav-icon {
        text-align: center;
        font-size: 20px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    }
    
    .uav-symbol {
        font-size: 24px;
        margin-bottom: 2px;
    }
    
    .uav-id-label {
        font-size: 8px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        background: rgba(0,0,0,0.7);
        padding: 1px 3px;
        border-radius: 2px;
        color: #00ff41;
    }
    
    .emergency-blink {
        position: absolute;
        top: -5px;
        right: -5px;
        animation: blink 0.5s infinite;
    }
    
    .military-waypoint {
        background: transparent;
        border: none;
    }
    
    .waypoint-marker {
        width: 20px;
        height: 20px;
        background: #00ff41;
        color: #0a0e1a;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        border: 2px solid #0a0e1a;
    }
    
    .military-popup {
        font-family: 'Courier New', monospace;
        min-width: 250px;
    }
    
    .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid #00ff41;
    }
    
    .classification-mini {
        background: #ff6b35;
        color: #0a0e1a;
        padding: 2px 5px;
        border-radius: 2px;
        font-size: 8px;
        font-weight: bold;
    }
    
    .popup-content {
        font-size: 12px;
    }
    
    .popup-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
    }
    
    .popup-row span:first-child {
        color: #8892b0;
    }
    
    .popup-row span:last-child {
        color: #e0e6ed;
        font-weight: bold;
    }
    
    .geofence-popup {
        text-align: center;
        font-family: 'Courier New', monospace;
    }
    
    .warning-text {
        color: #ff3838;
        font-weight: bold;
        animation: blink 1s infinite;
    }
    
    .status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 5px;
    }
    
    .status-indicator.active {
        background: #00ff41;
    }
    
    .status-indicator.degraded {
        background: #ff6b35;
    }
    
    .status-indicator.offline {
        background: #ff3838;
    }
`;
document.head.appendChild(style);
