# UAV Command & Control System - Windows WPF Application

A native Windows WPF application for military-grade UAV monitoring and control, designed for NATO deployments and Windows-based control systems.

## 🎯 **Features**

### **🔒 Military-Grade Interface**
- **Native Windows Application** - Full WPF implementation
- **No animations or fancy effects** - Pure functional design
- **High contrast colors** - Optimized for operational environments
- **Sharp-edged UI** - Military standard interface design
- **Monospace fonts** - Precise data display
- **Role-based access control** - Commander, Operator, Analyst roles

### **📊 Core Functionality**
- **Real-time UAV tracking** with 6 simulated military UAVs
- **Tactical map display** with UAV positions and flight paths
- **Mission log** with UTC timestamps and export capability
- **System status monitoring** - Communications, GPS, encryption status
- **Video feed simulation** - Optical and thermal camera feeds
- **Geofencing** - No-fly zone visualization and violation detection
- **UAV control commands** - Pause, RTB (Return to Base), Emergency Stop

### **🚁 UAV Fleet**
- **MQ-9 Reaper** - Armed reconnaissance UAV
- **MQ-1 Predator** - Armed surveillance UAV  
- **RQ-11 Raven** - Small tactical UAV
- **AeroVironment Wasp** - Micro UAV
- **RQ-21 Blackjack** - Tactical reconnaissance UAV
- **RQ-7 Shadow** - Battlefield surveillance UAV

## 🛠️ **Technical Stack**

- **.NET 6** - Modern .NET framework
- **WPF (Windows Presentation Foundation)** - Native Windows UI
- **MVVM Pattern** - Clean architecture with ViewModels
- **Dependency Injection** - Microsoft.Extensions.DependencyInjection
- **Logging** - Microsoft.Extensions.Logging
- **Real-time Updates** - Timer-based simulation system

## 📦 **Installation & Setup**

### **Prerequisites**
- **Windows 10/11** (x64)
- **.NET 6 Runtime** or higher
- **Visual Studio 2022** (for development)

### **Quick Start**

1. **Clone or extract the project**
   \`\`\`bash
   cd UAVCommand
   \`\`\`

2. **Build the application**
   \`\`\`bash
   dotnet build
   \`\`\`

3. **Run the application**
   \`\`\`bash
   dotnet run
   \`\`\`

4. **Login with demo credentials**
   - **Commander**: `commander` / `password123`
   - **Operator**: `operator` / `password123`
   - **Analyst**: `analyst` / `password123`

### **Development Setup**

1. **Open in Visual Studio 2022**
   \`\`\`bash
   start UAVCommand.sln
   \`\`\`

2. **Restore NuGet packages**
   - Right-click solution → Restore NuGet Packages

3. **Set startup project**
   - Right-click UAVCommand → Set as Startup Project

4. **Run with F5** or Ctrl+F5

## 🏗️ **Project Structure**

\`\`\`
UAVCommand/
├── Models/                 # Data models (UAV, User, LogEntry)
├── Services/              # Business logic services
│   ├── UAVService.cs      # UAV simulation and management
│   ├── AuthenticationService.cs  # User authentication
│   ├── LogService.cs      # Mission logging
│   ├── MapService.cs      # Map operations
│   ├── GeofenceService.cs # No-fly zone management
│   └── VideoFeedService.cs # Video feed simulation
├── Views/                 # WPF Windows and UserControls
│   ├── LoginWindow.xaml   # Authentication window
│   ├── MainWindow.xaml    # Main dashboard
│   ├── UAVDetailWindow.xaml # Detailed UAV status
│   └── VideoFeedWindow.xaml # Live video feeds
├── ViewModels/            # MVVM ViewModels
├── Styles/                # WPF styling resources
│   ├── MilitaryTheme.xaml # Main theme definitions
│   └── MilitaryGroupBox.xaml # Custom GroupBox style
└── Resources/             # Application resources
\`\`\`

## 🎮 **Usage Guide**

### **Main Dashboard**
- **Left Panel**: UAV status cards with real-time telemetry
- **Center Panel**: Tactical map with UAV positions and flight paths
- **Right Panel**: Mission log with timestamps
- **Bottom Panel**: System status, alerts, and video feeds

### **UAV Controls**
- **PAUSE**: Pause/resume UAV mission
- **RTB**: Return to base command
- **KILL**: Emergency stop (requires confirmation)

### **Map Features**
- **CENTER**: Focus map on all active UAVs
- **PATHS**: Toggle flight path visibility
- **Layer Selection**: Switch between Satellite, Terrain, Street views
- **Mouse Coordinates**: Real-time lat/lon display

### **Mission Log**
- **Real-time entries** with UTC timestamps
- **CLEAR**: Clear current log
- **EXPORT**: Save log to text file

### **Video Feeds**
- **4 simultaneous feeds** from different UAVs
- **Optical and thermal** camera simulation
- **Click to open** full-screen video window

## 🔧 **Configuration**

### **User Roles & Permissions**
- **Commander**: Full system access, all commands
- **Operator**: UAV control, video feeds, waypoint creation
- **Analyst**: Data viewing, feeds, report generation

### **UAV Simulation Settings**
- **Update Interval**: 2 seconds (configurable in UAVService)
- **Battery Drain**: Realistic consumption based on activity
- **Flight Patterns**: Automatic waypoint navigation
- **Emergency Conditions**: Low battery triggers emergency status

### **Logging Configuration**
- **Console Logging**: Enabled for development
- **File Logging**: Can be configured via appsettings.json
- **Log Levels**: Info, Warning, Error, Success

## 🚀 **Deployment**

### **Standalone Executable**
\`\`\`bash
dotnet publish -c Release -r win-x64 --self-contained true
\`\`\`

### **Windows Service**
The application can be modified to run as a Windows Service for unattended operation.

### **Network Deployment**
- **ClickOnce**: For easy network deployment
- **MSI Installer**: For enterprise deployment
- **Group Policy**: For domain-wide installation

## 🔒 **Security Features**

- **Role-based authentication** with session management
- **Encrypted communication** simulation indicators
- **Classification banners** (UNCLASSIFIED/CLASSIFIED)
- **Audit logging** of all user actions and commands
- **Session timeout** and automatic logout

## 📊 **Performance**

- **Low CPU usage** - Optimized update cycles
- **Minimal memory footprint** - Efficient data structures
- **Responsive UI** - Non-blocking operations
- **Scalable architecture** - Ready for real UAV integration

## 🔧 **Customization**

### **Adding New UAV Types**
1. Extend `UAVType` enum in `Models/UAV.cs`
2. Update `UAVService.InitializeDemoUAVs()` method
3. Add corresponding UI styling in `MilitaryTheme.xaml`

### **Custom Commands**
1. Add command handling in `UAVService.SendCommandAsync()`
2. Update UI buttons in `MainWindow.xaml`
3. Add logging entries for audit trail

### **Theme Customization**
- Modify colors in `Styles/MilitaryTheme.xaml`
- Day/Night theme switching available
- High contrast mode support

## 🐛 **Troubleshooting**

### **Common Issues**
1. **Application won't start**: Check .NET 6 runtime installation
2. **Login fails**: Verify demo credentials (case-sensitive)
3. **UAVs not updating**: Check console for service errors
4. **Map not displaying**: Verify canvas rendering in debug mode

### **Debug Mode**
- Set breakpoints in Visual Studio
- Check console output for service logs
- Use WPF Inspector for UI debugging

## 📄 **License**

This application is designed for educational and demonstration purposes. Suitable for military training, academic research, and system integration testing.

---

**🚁 Ready for NATO deployment and Windows-based control systems!**

## 🔗 **Integration Points**

- **Real UAV Hardware**: Replace simulation with actual telemetry feeds
- **Military Networks**: Integrate with SIPR/NIPR networks
- **Command Systems**: Connect to existing C4ISR infrastructure
- **Database Systems**: Add persistent storage for mission data
- **External APIs**: Integrate with weather, NOTAM, and airspace data

The application provides a solid foundation for real-world military UAV command and control operations.
