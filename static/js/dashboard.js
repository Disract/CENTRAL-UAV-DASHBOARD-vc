class UAVDashboard {
    constructor() {
        this.map = null;
        this.socket = null;
        this.uavMarkers = new Map();
        this.uavPaths = new Map();
        this.showPaths = true;
        this.batteryChart = null;
        
        this.init();
    }
    
    init() {
        this.initMap();
        this.initSocket();
        this.initEventListeners();
        this.initCharts();
    }
    
    initMap() {
        // Initialize Leaflet map centered on NYC
        this.map = L.map('map').setView([12.8406, 80.1530], 15); 
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Add dark theme tiles for better visibility
        L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
            attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors'
        }).addTo(this.map);
    }
    
    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });
        
        this.socket.on('uav_data', (data) => {
            this.updateUAVs(data);
        });
        
        this.socket.on('uav_update', (data) => {
            this.updateUAVs(data);
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
        
        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('uav-modal').style.display = 'none';
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('uav-modal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    initCharts() {
        const ctx = document.getElementById('batteryChart').getContext('2d');
        this.batteryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Battery Level (%)',
                    data: [],
                    backgroundColor: 'rgba(72, 187, 120, 0.8)',
                    borderColor: 'rgba(72, 187, 120, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        statusElement.textContent = connected ? 'Connected' : 'Disconnected';
        statusElement.className = `stat-value ${connected ? 'connected' : 'disconnected'}`;
    }
    
    updateUAVs(uavs) {
        // Update active UAV count
        document.getElementById('active-uavs').textContent = uavs.length;
        
        // Update map markers and paths
        this.updateMapMarkers(uavs);
        
        // Update sidebar UAV list
        this.updateUAVList(uavs);
        
        // Update charts
        this.updateCharts(uavs);
    }
    
    updateMapMarkers(uavs) {
        // Clear existing markers and paths
        this.uavMarkers.forEach(marker => this.map.removeLayer(marker));
        this.uavPaths.forEach(path => this.map.removeLayer(path));
        this.uavMarkers.clear();
        this.uavPaths.clear();
        
        uavs.forEach(uav => {
            // Create custom icon based on UAV type
            const iconUrl = uav.type === 'quadcopter' 
                ? 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${this.getUAVColor(uav)}">
                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                    </svg>
                `)
                : 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${this.getUAVColor(uav)}">
                        <path d="M21,16V14L13,9V7A1,1 0 0,0 12,6A1,1 0 0,0 11,7V9L3,14V16L11,13.5V19L8.5,20.5V22L12,21L15.5,22V20.5L13,19V13.5L21,16Z"/>
                    </svg>
                `);
            
            const icon = L.icon({
                iconUrl: iconUrl,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });
            
            // Create marker
            const marker = L.marker([uav.lat, uav.lon], { icon: icon })
                .bindPopup(this.createPopupContent(uav))
                .addTo(this.map);
            
            // Add click event to show detailed modal
            marker.on('click', () => {
                this.showUAVModal(uav);
            });
            
            this.uavMarkers.set(uav.id, marker);
            
            // Create path if enabled and path history exists
            if (this.showPaths && uav.path_history && uav.path_history.length > 1) {
                const pathColor = this.getUAVColor(uav);
                const path = L.polyline(uav.path_history, {
                    color: pathColor,
                    weight: 3,
                    opacity: 0.7
                }).addTo(this.map);
                
                this.uavPaths.set(uav.id, path);
            }
            
            // Add waypoints
            if (uav.waypoints) {
                uav.waypoints.forEach((waypoint, index) => {
                    const waypointMarker = L.circleMarker([waypoint[0], waypoint[1]], {
                        radius: 5,
                        fillColor: this.getUAVColor(uav),
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).bindPopup(`Waypoint ${index + 1} for ${uav.id}`).addTo(this.map);
                });
            }
        });
    }
    
    updateUAVList(uavs) {
        const uavList = document.getElementById('uav-list');
        uavList.innerHTML = '';
        
        uavs.forEach(uav => {
            const uavCard = this.createUAVCard(uav);
            uavList.appendChild(uavCard);
        });
    }
    
    createUAVCard(uav) {
        const card = document.createElement('div');
        card.className = 'uav-card';
        card.onclick = () => this.showUAVModal(uav);
        
        const batteryClass = this.getBatteryClass(uav.battery_level);
        
        card.innerHTML = `
            <div class="uav-card-header">
                <span class="uav-id">${uav.id}</span>
                <span class="uav-type type-${uav.type}">${uav.type.replace('_', ' ')}</span>
            </div>
            <div class="uav-telemetry">
                <div class="telemetry-item">
                    <span class="telemetry-label">Speed:</span>
                    <span class="telemetry-value">${uav.speed} m/s</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Altitude:</span>
                    <span class="telemetry-value">${uav.altitude} m</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Heading:</span>
                    <span class="telemetry-value">${uav.heading}°</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Battery:</span>
                    <span class="telemetry-value battery-level ${batteryClass}">${uav.battery_level}%</span>
                </div>
            </div>
            <div class="uav-status status-${uav.mission_status}">
                ${uav.mission_status.replace('_', ' ')}
            </div>
            <div class="uav-controls">
                <button class="uav-control-btn pause-btn" onclick="event.stopPropagation(); toggleUAVPause('${uav.id}')">
                    ${uav.paused ? 'Resume' : 'Pause'}
                </button>
                <button class="uav-control-btn kill-btn" onclick="event.stopPropagation(); killUAV('${uav.id}')">
                    Emergency
                </button>
            </div>
        `;
        
        return card;
    }
    
    createPopupContent(uav) {
        const batteryClass = this.getBatteryClass(uav.battery_level);
        
        return `
            <div style="min-width: 200px;">
                <h4 style="margin-bottom: 10px; color: #63b3ed;">${uav.id}</h4>
                <p><strong>Type:</strong> ${uav.type.replace('_', ' ')}</p>
                <p><strong>Position:</strong> ${uav.lat.toFixed(4)}, ${uav.lon.toFixed(4)}</p>
                <p><strong>Altitude:</strong> ${uav.altitude} m</p>
                <p><strong>Speed:</strong> ${uav.speed} m/s</p>
                <p><strong>Heading:</strong> ${uav.heading}°</p>
                <p><strong>Battery:</strong> <span class="battery-level ${batteryClass}">${uav.battery_level}%</span></p>
                <p><strong>Status:</strong> ${uav.mission_status.replace('_', ' ')}</p>
            </div>
        `;
    }
    
    showUAVModal(uav) {
        const modal = document.getElementById('uav-modal');
        const modalBody = document.getElementById('modal-body');
        
        const batteryClass = this.getBatteryClass(uav.battery_level);
        
        modalBody.innerHTML = `
            <h2 style="color: #63b3ed; margin-bottom: 1rem;">${uav.id} - Detailed View</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                    <h3 style="color: #a0aec0; margin-bottom: 0.5rem;">Current Status</h3>
                    <p><strong>Type:</strong> ${uav.type.replace('_', ' ')}</p>
                    <p><strong>Mission Status:</strong> ${uav.mission_status.replace('_', ' ')}</p>
                    <p><strong>Paused:</strong> ${uav.paused ? 'Yes' : 'No'}</p>
                    
                    <h3 style="color: #a0aec0; margin: 1rem 0 0.5rem 0;">Position & Movement</h3>
                    <p><strong>Latitude:</strong> ${uav.lat.toFixed(6)}</p>
                    <p><strong>Longitude:</strong> ${uav.lon.toFixed(6)}</p>
                    <p><strong>Altitude:</strong> ${uav.altitude} m</p>
                    <p><strong>Speed:</strong> ${uav.speed} m/s</p>
                    <p><strong>Heading:</strong> ${uav.heading}°</p>
                </div>
                
                <div>
                    <h3 style="color: #a0aec0; margin-bottom: 0.5rem;">System Status</h3>
                    <p><strong>Battery Level:</strong> <span class="battery-level ${batteryClass}">${uav.battery_level}%</span></p>
                    
                    <h3 style="color: #a0aec0; margin: 1rem 0 0.5rem 0;">Home Base</h3>
                    <p><strong>Home Lat:</strong> ${uav.home_lat.toFixed(6)}</p>
                    <p><strong>Home Lon:</strong> ${uav.home_lon.toFixed(6)}</p>
                    
                    <h3 style="color: #a0aec0; margin: 1rem 0 0.5rem 0;">Mission Progress</h3>
                    <p><strong>Waypoints:</strong> ${uav.waypoints ? uav.waypoints.length : 0}</p>
                    <p><strong>Current Waypoint:</strong> ${uav.current_waypoint + 1}</p>
                </div>
            </div>
            
            <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                <button class="uav-control-btn pause-btn" onclick="toggleUAVPause('${uav.id}'); document.getElementById('uav-modal').style.display='none';">
                    ${uav.paused ? 'Resume UAV' : 'Pause UAV'}
                </button>
                <button class="uav-control-btn kill-btn" onclick="killUAV('${uav.id}'); document.getElementById('uav-modal').style.display='none';">
                    Emergency Stop
                </button>
            </div>
        `;
        
        modal.style.display = 'block';
    }
    
    updateCharts(uavs) {
        const labels = uavs.map(uav => uav.id);
        const batteryData = uavs.map(uav => uav.battery_level);
        const colors = uavs.map(uav => {
            if (uav.battery_level < 20) return 'rgba(245, 101, 101, 0.8)';
            if (uav.battery_level < 50) return 'rgba(237, 137, 54, 0.8)';
            return 'rgba(72, 187, 120, 0.8)';
        });
        
        this.batteryChart.data.labels = labels;
        this.batteryChart.data.datasets[0].data = batteryData;
        this.batteryChart.data.datasets[0].backgroundColor = colors;
        this.batteryChart.update();
    }
    
    centerMapOnUAVs() {
        if (this.uavMarkers.size === 0) return;
        
        const group = new L.featureGroup(Array.from(this.uavMarkers.values()));
        this.map.fitBounds(group.getBounds().pad(0.1));
    }
    
    togglePaths() {
        this.showPaths = !this.showPaths;
        const button = document.getElementById('toggle-paths');
        button.textContent = this.showPaths ? '📍 Hide Paths' : '📍 Show Paths';
        
        if (!this.showPaths) {
            this.uavPaths.forEach(path => this.map.removeLayer(path));
            this.uavPaths.clear();
        }
    }
    
    getUAVColor(uav) {
        if (uav.mission_status === 'emergency') return '#f56565';
        if (uav.paused) return '#ed8936';
        return uav.type === 'quadcopter' ? '#48bb78' : '#4299e1';
    }
    
    getBatteryClass(batteryLevel) {
        if (batteryLevel < 20) return 'low';
        if (batteryLevel < 50) return 'medium';
        return '';
    }
}

// Global functions for UAV controls
function toggleUAVPause(uavId) {
    fetch(`/api/uav/${uavId}/pause`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            console.log('UAV pause toggled:', data);
        })
        .catch(error => {
            console.error('Error toggling UAV pause:', error);
        });
}

function killUAV(uavId) {
    if (confirm(`Are you sure you want to emergency stop ${uavId}?`)) {
        fetch(`/api/uav/${uavId}/kill`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                console.log('UAV killed:', data);
            })
            .catch(error => {
                console.error('Error killing UAV:', error);
            });
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new UAVDashboard();
});
