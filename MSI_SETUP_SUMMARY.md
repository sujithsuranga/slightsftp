# Windows MSI Installer Setup - Summary

## What Was Configured

Your SLightSFTP application is now ready to be packaged as a Windows MSI installer!

## Changes Made

### 1. Package Configuration (`package.json`)
- Added `electron-builder` as a dev dependency
- Added build scripts:
  - `npm run dist` - Build for current platform
  - `npm run dist:win` - Build Windows MSI installer
- Configured MSI-specific options:
  - Installation directory selection
  - Desktop shortcut creation
  - Start Menu shortcuts
  - Administrator privileges requirement

### 2. Application Structure (`src/main.ts`)
- Added `getAppDirectories()` function to determine correct paths for development vs production
- Added `ensureDirectories()` function to create required directories on startup
- Modified database initialization to use the config directory
- Modified FTP root path to use the data directory
- All paths now work correctly in both development and production environments

### 3. Directory Structure

**Development Mode** (current):
```
<project-root>\
├── config.db          (Current directory)
├── ftp-root\          (Current directory)
└── ...
```

**Production Mode** (after installation):
```
C:\Program Files\SLightSFTP\
├── bin\
│   └── SLightSFTP.exe
├── config\
│   └── config.db
├── data\
│   └── ftp-root\
├── logs\
└── resources\
```

## Building the MSI Installer

### Prerequisites
1. Windows PC
2. Node.js installed
3. Administrator privileges (for testing installation)

### Build Steps

```powershell
# Step 1: Install all dependencies
npm install

# Step 2: Compile TypeScript
npm run build

# Step 3: Create MSI installer
npm run dist:win
```

### Build Output
The MSI file will be created in:
```
release\SLightSFTP-1.0.0-setup.msi
```

## Installation Features

When a user runs the MSI installer, they will:

1. **Select Installation Location**
   - Default: `C:\Program Files\SLightSFTP`
   - Can be changed during installation

2. **Choose Shortcuts**
   - Desktop shortcut option
   - Start Menu shortcut (always created)

3. **Automatic Setup**
   - Creates all required directories
   - Sets proper permissions
   - Registers in Windows Programs & Features

4. **First Launch**
   - Database is created automatically
   - Default admin user is created
   - Default listeners are configured
   - Default credentials: `admin` / `admin123`

## Testing the Installer

### 1. Build the MSI
```powershell
npm run dist:win
```

### 2. Install
- Right-click `release\SLightSFTP-1.0.0-setup.msi`
- Select "Install"
- Follow the installation wizard

### 3. Launch
- Use desktop shortcut, or
- Search "SLightSFTP Server" in Start Menu, or
- Run directly: `C:\Program Files\SLightSFTP\bin\SLightSFTP.exe`

### 4. Verify
- Application should start
- Login with `admin` / `admin123`
- Check that database is created in `C:\Program Files\SLightSFTP\config\`
- Check that FTP root is at `C:\Program Files\SLightSFTP\data\ftp-root\`

## Customization Options

### Change Version
Edit `package.json`:
```json
{
  "version": "1.0.1"
}
```

### Change Product Name
Edit `package.json`:
```json
{
  "build": {
    "productName": "Your Custom Name"
  }
}
```

### Add Application Icon
1. Create/obtain a 256x256 icon
2. Convert to `.ico` format
3. Save as `build/icon.ico`
4. Uncomment icon line in `package.json`:
   ```json
   "win": {
     "icon": "build/icon.ico"
   }
   ```

### Change Default Installation Path
Edit `package.json` MSI configuration:
```json
{
  "msi": {
    "perMachine": true  // true = C:\Program Files, false = C:\Users\<user>\AppData\Local
  }
}
```

## Distribution

Once built, you can distribute the MSI file by:
1. **Direct Download** - Host on your website
2. **Email** - Send to users directly
3. **Network Share** - Place on shared drive
4. **USB Drive** - Copy for offline installation

The MSI file is self-contained and includes all dependencies except Windows itself.

## Uninstallation

Users can uninstall via:
1. Windows Settings → Apps → SLightSFTP → Uninstall
2. Control Panel → Programs and Features → SLightSFTP → Uninstall

**Note**: Configuration files in `config\` directory will be preserved unless manually deleted.

## Security Notes

1. **Administrator Privileges**: Required for:
   - Installing to `C:\Program Files`
   - Binding to ports 21 and 22 (standard FTP/SFTP ports)

2. **Windows Defender**: May flag the installer initially. You may need to:
   - Sign the installer with a code signing certificate
   - Submit to Microsoft for reputation building

3. **Firewall**: Windows Firewall will prompt users to allow network access on first run

## Troubleshooting

### Build Fails
- Ensure all dependencies are installed: `npm install`
- Clean build: `Remove-Item dist, release -Recurse -Force`
- Rebuild: `npm run build && npm run dist:win`

### Installation Fails
- Run installer as Administrator
- Check Windows Event Viewer for details
- Ensure no previous version is running

### Application Won't Start
- Check `config\` directory permissions
- Verify database file isn't locked
- Run as Administrator

## Next Steps

1. **Test the Installer**: Build and test on a clean Windows machine
2. **Add Icon**: Create and add your custom icon
3. **Code Signing** (Optional but recommended):
   - Obtain a code signing certificate
   - Sign the MSI to avoid Windows security warnings
4. **Create Documentation**: User manual, installation guide
5. **Set Up Updates**: Plan for version updates and distribution

## Additional Resources

- See `BUILD.md` for detailed build instructions
- electron-builder docs: https://www.electron.build/
- WiX Toolset docs: https://wixtoolset.org/

## Support

For issues with the installer:
1. Check build logs in `release\` directory
2. Verify all dependencies are installed
3. Ensure Windows is up to date
4. Test on a clean Windows installation

---

**Your application is now ready for professional Windows deployment!** 🎉
