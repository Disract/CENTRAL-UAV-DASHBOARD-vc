/**
 * UAV Command & Control System - JavaScript
 * Military-grade interface with no animations or fancy effects
 */

class CommandInterface {
    constructor() {
        this.map = null;
        this.socket = null;
        this.uavMarkers = new Map();
        this.uavPaths = new Map();
        this.geofences = new Map();
        this.showPaths = true;
        this.currentLayer = 'satellite';
        this.theme = 'day';
        
        this.init();
    }
    
    init() {
        this.initSystemClock();
        this.initMap();
        this.initSocket();
        this.initEventListeners();
        this.initTheme();
        
        // Add initial log entry
        this.addLogEntry('SYSTEM INITIALIZED', 'info');
    }
    
    initSystemClock() {
        const updateClock = () => {
            const now = new Date();
            const timeStr = now.toISOString().substr(11, 8) + ' UTC';
            const dateStr = now.toISOString().substr(0, 10);
            
            const timeElement = document.getElementById('system-time');
            if (timeElement) {
                timeElement.textContent = `${dateStr} ${timeStr}`;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    initMap() {
        // Initialize Leaflet map
        this.map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([12.8406, 80.1530], 11);
        
        // Add zoom control to bottom left
        L.control.zoom({
            position: 'bottomleft'
        }).addTo(this.map);
        
        // Define tile layers
        this.tileLayers = {
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Command System'
            }),
            terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Command System'
            }),
            street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'Command System'
            })
        };
        
        // Set default layer
        this.tileLayers[this.currentLayer].addTo(this.map);
        
        // Add mouse coordinate display
        this.map.on('mousemove', (e) => {
            const coords = document.getElementById('mouse-coords');
            if (coords) {
                coords.textContent = `LAT: ${e.latlng.lat.toFixed(6)} LON: ${e.latlng.lng.toFixed(6)}`;
            }
        });
    }
    
    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Command system connected');
            this.updateCommStatus('SECURE');
            this.addLogEntry('COMMUNICATIONS ESTABLISHED', 'success');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Command system disconnected');
            this.updateCommStatus('OFFLINE');
            this.addLogEntry('COMMUNICATIONS LOST', 'error');
        });
        
        this.socket.on('uav_data', (data) => {
            this.updateUAVs(data);
        });
        
        this.socket.on('uav_update', (data) => {
            this.updateUAVs(data);
        });
        
        this.socket.on('alerts', (alerts) => {
            this.handleAlerts(alerts);
        });
        
        this.socket.on('video_update', (feeds) => {
            this.updateVideoFeeds(feeds);
        });
        
        this.socket.on('geofence_data', (data) => {
            this.updateGeofences(data);
        });
    }
    
    initEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Map controls
        document.getElementById('center-map')?.addEventListener('click', () => {
            this.centerMapOnUAVs();
        });
        
        document.getElementById('toggle-paths')?.addEventListener('click', () => {
            this.togglePaths();
        });
        
        document.getElementById('map-layer')?.addEventListener('change', (e) => {
            this.switchLayer(e.target.value);
        });
        
        // Log controls
        document.getElementById('clear-log')?.addEventListener('click', () => {
            this.clearLog();
        });
        
        document.getElementById('export-log')?.addEventListener('click', () => {
            this.exportLog();
        });
        
        // UAV refresh
        document.getElementById('refresh-uavs')?.addEventListener('click', () => {
            this.refreshUAVs();
        });
    }
    
    initTheme() {
        const savedTheme = localStorage.getItem('command-theme') || 'day';
        this.setTheme(savedTheme);
    }
    
    toggleTheme() {
        const newTheme = this.theme === 'day' ? 'night' : 'day';
        this.setTheme(newTheme);
    }
    
    setTheme(theme) {
        this.theme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('command-theme', theme);
        this.addLogEntry(`DISPLAY MODE: ${theme.toUpperCase()}`, 'info');
    }
    
    updateCommStatus(status) {
        const statusElement = document.getElementById('comm-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = status === 'SECURE' ? 'status-value' : 'status-value status-inactive';
        }
    }
    
    updateUAVs(uavs) {
        // Update active count
        const activeCount = uavs.filter(uav => 
            uav.mission_status !== 'idle' && uav.mission_status !== 'emergency'
        ).length;
        
        const activeElement = document.getElementById('active-uavs');
        if (activeElement) {
            activeElement.textContent = activeCount;
        }
        
        // Update map markers
        this.updateMapMarkers(uavs);
        
        // Update UAV list
        this.updateUAVList(uavs);
    }
    
    updateMapMarkers(uavs) {
        // Clear existing markers
        this.uavMarkers.forEach(marker => this.map.removeLayer(marker));
        this.uavPaths.forEach(path => this.map.removeLayer(path));
        this.uavMarkers.clear();
        this.uavPaths.clear();
        
        uavs.forEach(uav => {
            // Create simple marker icon
            const iconHtml = this.createUAVIcon(uav);
            const icon = L.divIcon({
                html: iconHtml,
                className: 'uav-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            // Create marker
            const marker = L.marker([uav.lat, uav.lon], { icon })
                .bindPopup(this.createPopupContent(uav))
                .addTo(this.map);
            
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
                    opacity: 0.8
                }).addTo(this.map);
                
                this.uavPaths.set(uav.id, path);
            }
            
            // Add waypoints
            if (uav.waypoints && uav.mission_status === 'en_route') {
                uav.waypoints.forEach((waypoint, index) => {
                    const waypointIcon = L.divIcon({
                        html: `<div class="waypoint-marker">${index + 1}</div>`,
                        className: 'waypoint',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    });
                    
                    L.marker([waypoint[0], waypoint[1]], { icon: waypointIcon })
                        .bindPopup(`WAYPOINT ${index + 1} - ${uav.id}`)
                        .addTo(this.map);
                });
            }
        });
    }
    
    createUAVIcon(uav) {
        const color = this.getUAVColor(uav);
        const symbol = uav.type === 'quadcopter' ? '●' : '▲';
        
        return `<div style="color: ${color}; font-size: 16px; font-weight: bold; text-align: center; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">${symbol}</div>`;
    }
    
    createPopupContent(uav) {
        const batteryClass = this.getBatteryClass(uav.battery_level);
        
        return `
            <div style="font-family: monospace; font-size: 11px; min-width: 200px;">
                <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">
                    ${uav.id} - ${uav.model || uav.type.toUpperCase()}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <div>LAT:</div><div>${uav.lat.toFixed(6)}</div>
                    <div>LON:</div><div>${uav.lon.toFixed(6)}</div>
                    <div>ALT:</div><div>${uav.altitude}m</div>
                    <div>SPD:</div><div>${uav.speed} m/s</div>
                    <div>HDG:</div><div>${uav.heading}°</div>
                    <div>BAT:</div><div class="${batteryClass}">${uav.battery_level}%</div>
                    <div>STS:</div><div>${uav.mission_status.toUpperCase()}</div>
                </div>
            </div>
        `;
    }
    
    updateUAVList(uavs) {
        const container = document.getElementById('uav-list');
        if (!container) return;
        
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
        const statusClass = `status-${uav.mission_status}`;
        
        card.innerHTML = `
            <div class="uav-card-header">
                <span class="uav-id">${uav.id}</span>
                <span class="uav-type">${uav.type.toUpperCase()}</span>
            </div>
            <div class="uav-telemetry">
                <div class="telemetry-row">
                    <span class="telemetry-label">ALT:</span>
                    <span class="telemetry-value">${uav.altitude}m</span>
                </div>
                <div class="telemetry-row">
                    <span class="telemetry-label">SPD:</span>
                    <span class="telemetry-value">${uav.speed} m/s</span>
                </div>
                <div class="telemetry-row">
                    <span class="telemetry-label">HDG:</span>
                    <span class="telemetry-value">${uav.heading}°</span>
                </div>
                <div class="telemetry-row">
                    <span class="telemetry-label">BAT:</span>
                    <span class="telemetry-value ${batteryClass}">${uav.battery_level}%</span>
                </div>
            </div>
            <div class="uav-status ${statusClass}">
                ${uav.mission_status.replace('_', ' ').toUpperCase()}
            </div>
            <div class="uav-controls">
                <button class="uav-control-btn control-pause" onclick="event.stopPropagation(); sendCommand('${uav.id}', 'pause')">
                    ${uav.paused ? 'RESUME' : 'PAUSE'}
                </button>
                <button class="uav-control-btn control-rtb" onclick="event.stopPropagation(); sendCommand('${uav.id}', 'rtb')">
                    RTB
                </button>
                <button class="uav-control-btn control-kill" onclick="event.stopPropagation(); sendCommand('${uav.id}', 'kill')">
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
                dashArray: '5, 5'
            }).bindPopup(`
                <div style="font-family: monospace; font-size: 11px;">
                    <div style="font-weight: bold; color: red;">RESTRICTED AIRSPACE</div>
                    <div>ZONE: ${geofence.name}</div>
                    <div>ID: ${geofence.id}</div>
                </div>
            `).addTo(this.map);
            
            this.geofences.set(geofence.id, polygon);
        });
    }
    
    updateVideoFeeds(feeds) {
        const container = document.getElementById('video-feeds');
        if (!container) return;
        
        container.innerHTML = '';
        
        feeds.slice(0, 4).forEach(feed => {
            const feedElement = document.createElement('div');
            feedElement.className = 'video-feed';
            feedElement.onclick = () => this.showVideoModal();
            
            feedElement.innerHTML = `
                <div class="video-thumbnail">
                    ${feed.feed_type.toUpperCase()}
                </div>
                <div class="video-info">
                    <div class="video-title">${feed.uav_id}</div>
                    <div class="video-status">${feed.status.toUpperCase()}</div>
                </div>
            `;
            
            container.appendChild(feedElement);
        });
    }
    
    handleAlerts(alerts) {
        const container = document.getElementById('alert-container');
        if (!container) return;
        
        alerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = `alert-item alert-${alert.severity}`;
            alertElement.textContent = alert.message;
            
            container.insertBefore(alertElement, container.firstChild);
            
            // Add to log
            this.addLogEntry(`ALERT: ${alert.message}`, 'warning');
        });
        
        // Keep only last 5 alerts
        while (container.children.length > 5) {
            container.removeChild(container.lastChild);
        }
    }
    
    showUAVDetails(uav) {
        const modal = new bootstrap.Modal(document.getElementById('uavModal'));
        const modalBody = document.getElementById('uav-modal-body');
        
        const batteryClass = this.getBatteryClass(uav.battery_level);
        
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <table class="detail-table">
                        <thead>
                            <tr><th colspan="2">AIRCRAFT IDENTIFICATION</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>CALL SIGN:</td><td>${uav.id}</td></tr>
                            <tr><td>MODEL:</td><td>${uav.model || 'UNKNOWN'}</td></tr>
                            <tr><td>TYPE:</td><td>${uav.type.toUpperCase()}</td></tr>
                            <tr><td>STATUS:</td><td>${uav.mission_status.toUpperCase()}</td></tr>
                        </tbody>
                    </table>
                    
                    <table class="detail-table">
                        <thead>
                            <tr><th colspan="2">POSITION & NAVIGATION</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>LATITUDE:</td><td>${uav.lat.toFixed(6)}°</td></tr>
                            <tr><td>LONGITUDE:</td><td>${uav.lon.toFixed(6)}°</td></tr>
                            <tr><td>ALTITUDE:</td><td>${uav.altitude}m MSL</td></tr>
                            <tr><td>HEADING:</td><td>${uav.heading}° TRUE</td></tr>
                            <tr><td>GROUND SPEED:</td><td>${uav.speed} m/s</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="col-md-6">
                    <table class="detail-table">
                        <thead>
                            <tr><th colspan="2">SYSTEM STATUS</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>BATTERY:</td><td class="${batteryClass}">${uav.battery_level}%</td></tr>
                            <tr><td>FUEL:</td><td>${uav.fuel_level || 0}%</td></tr>
                            <tr><td>COMMS:</td><td class="status-active">ENCRYPTED</td></tr>
                            <tr><td>GPS:</td><td class="status-active">LOCKED</td></tr>
                        </tbody>
                    </table>
                    
                    <table class="detail-table">
                        <thead>
                            <tr><th colspan="2">MISSION DATA</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>WAYPOINTS:</td><td>${uav.waypoints ? uav.waypoints.length : 0}</td></tr>
                            <tr><td>CURRENT WP:</td><td>${(uav.current_waypoint || 0) + 1}</td></tr>
                            <tr><td>HOME BASE:</td><td>${uav.home_lat.toFixed(4)}, ${uav.home_lon.toFixed(4)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-12">
                    <div class="btn-group w-100">
                        <button class="btn-command" onclick="sendCommand('${uav.id}', 'pause')">
                            ${uav.paused ? 'RESUME' : 'PAUSE'} MISSION
                        </button>
                        <button class="btn-command" onclick="sendCommand('${uav.id}', 'rtb')">
                            RETURN TO BASE
                        </button>
                        <button class="btn-command" onclick="sendCommand('${uav.id}', 'kill')">
                            EMERGENCY STOP
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.show();
    }
    
    showVideoModal() {
        const modal = new bootstrap.Modal(document.getElementById('videoModal'));
        const displayGrid = document.getElementById('video-display');
        
        displayGrid.innerHTML = `
            <div class="video-display">
                <div class="video-display-header">REAPER-01 - OPTICAL</div>
                <div class="video-display-content">LIVE FEED ACTIVE</div>
            </div>
            <div class="video-display">
                <div class="video-display-header">PREDATOR-02 - THERMAL</div>
                <div class="video-display-content">LIVE FEED ACTIVE</div>
            </div>
            <div class="video-display">
                <div class="video-display-header">RAVEN-03 - OPTICAL</div>
                <div class="video-display-content">FEED DEGRADED</div>
            </div>
            <div class="video-display">
                <div class="video-display-header">WASP-04 - OPTICAL</div>
                <div class="video-display-content">LIVE FEED ACTIVE</div>
            </div>
        `;
        
        modal.show();
    }
    
    switchLayer(layerName) {
        if (this.tileLayers[layerName]) {
            this.map.removeLayer(this.tileLayers[this.currentLayer]);
            this.tileLayers[layerName].addTo(this.map);
            this.currentLayer = layerName;
            this.addLogEntry(`MAP LAYER: ${layerName.toUpperCase()}`, 'info');
        }
    }
    
    togglePaths() {
        this.showPaths = !this.showPaths;
        const button = document.getElementById('toggle-paths');
        
        if (!this.showPaths) {
            this.uavPaths.forEach(path => this.map.removeLayer(path));
            this.uavPaths.clear();
        }
        
        this.addLogEntry(`FLIGHT PATHS: ${this.showPaths ? 'VISIBLE' : 'HIDDEN'}`, 'info');
    }
    
    centerMapOnUAVs() {
        if (this.uavMarkers.size === 0) return;
        
        const group = new L.featureGroup(Array.from(this.uavMarkers.values()));
        this.map.fitBounds(group.getBounds().pad(0.1));
        this.addLogEntry('MAP CENTERED ON ACTIVE UAVS', 'info');
    }
    
    refreshUAVs() {
        this.addLogEntry('UAV DATA REFRESH REQUESTED', 'info');
        // In a real system, this would trigger a data refresh
    }
    
    clearLog() {
        const container = document.getElementById('mission-log');
        if (container) {
            container.innerHTML = '';
            this.addLogEntry('MISSION LOG CLEARED', 'info');
        }
    }
    
    exportLog() {
        const container = document.getElementById('mission-log');
        if (!container) return;
        
        const entries = Array.from(container.children);
        const logData = entries.map(entry => {
            const timestamp = entry.querySelector('.log-timestamp')?.textContent || '';
            const message = entry.querySelector('.log-message')?.textContent || '';
            return `${timestamp} ${message}`;
        }).join('\n');
        
        const blob = new Blob([logData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mission-log-${new Date().toISOString().substr(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.addLogEntry('MISSION LOG EXPORTED', 'info');
    }
    
    addLogEntry(message, level = 'info') {
        const container = document.getElementById('mission-log');
        if (!container) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry log-level-${level}`;
        
        const now = new Date();
        const timestamp = now.toISOString().substr(11, 8);
        
        entry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span class="log-message">${message}</span>
        `;
        
        container.insertBefore(entry, container.firstChild);
        
        // Keep only last 100 entries
        while (container.children.length > 100) {
            container.removeChild(container.lastChild);
        }
    }
    
    getUAVColor(uav) {
        if (uav.mission_status === 'emergency') return '#dc3545';
        if (uav.paused) return '#fd7e14';
        if (uav.battery_level < 20) return '#dc3545';
        if (uav.battery_level < 50) return '#fd7e14';
        return uav.type === 'quadcopter' ? '#0dcaf0' : '#198754';
    }
    
    getBatteryClass(batteryLevel) {
        if (batteryLevel < 20) return 'battery-low';
        if (batteryLevel < 50) return 'battery-medium';
        return 'battery-high';
    }
}

// Global command functions
function sendCommand(uavId, command) {
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
            if (window.commandInterface) {
                window.commandInterface.addLogEntry(`COMMAND SENT: ${command.toUpperCase()} TO ${uavId}`, 'info');
            }
        } else {
            console.error(`Failed to send command to ${uavId}`);
            if (window.commandInterface) {
                window.commandInterface.addLogEntry(`COMMAND FAILED: ${command.toUpperCase()} TO ${uavId}`, 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error sending command:', error);
        if (window.commandInterface) {
            window.commandInterface.addLogEntry(`COMMAND ERROR: ${error.message}`, 'error');
        }
    });
}

// Initialize command interface when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.commandInterface = new CommandInterface();
});

// Add custom CSS for map markers
const style = document.createElement('style');
style.textContent = `
    .uav-marker {
        background: transparent;
        border: none;
        font-family: monospace;
        font-weight: bold;
    }
    
    .waypoint {
        background: transparent;
        border: none;
    }
    
    .waypoint-marker {
        width: 16px;
        height: 16px;
        background-color: #fd7e14;
        color: white;
        border: 1px solid #000;
        border-radius: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        font-family: monospace;
    }
`;
document.head.appendChild(style);
