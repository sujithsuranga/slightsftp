# Building SLightSFTP MSI Installer

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** (comes with Node.js)
3. **Windows** (for building MSI)
4. **WiX Toolset** v3.11 or higher (optional, electron-builder will download if needed)

## Directory Structure

The installed application will have the following structure:

```
C:\Program Files\SLightSFTP\
├── bin\                    # Application binaries
│   └── SLightSFTP.exe     # Main executable
├── config\                 # Configuration files
│   └── config.db          # Database file
├── data\                   # Data directory
│   └── ftp-root\          # Default FTP root directory
├── logs\                   # Log files
└── resources\              # Application resources
```

## Building the MSI Installer

### Step 1: Install Dependencies

```powershell
npm install
```

### Step 2: Build TypeScript

```powershell
npm run build
```

### Step 3: Create MSI Installer

```powershell
npm run dist:win
```

This will:
- Compile the TypeScript code
- Package the Electron application
- Create an MSI installer in the `release` directory

### Output

The MSI installer will be created at:
```
release/SLightSFTP-1.0.0-setup.msi
```

## Installation Features

The MSI installer includes:

✅ **User-selectable installation directory**
  - Default: `C:\Program Files\SLightSFTP`
  - User can change during installation

✅ **Desktop shortcut creation**
  - Prompted during installation

✅ **Start Menu shortcuts**
  - Automatically created in Start Menu

✅ **Proper uninstallation support**
  - Can be uninstalled from Windows Settings

✅ **Per-machine installation**
  - Installed for all users
  - Requires administrator privileges

## Icon File

Place your application icon at:
- `build/icon.ico` - Windows icon (256x256 recommended)

If no icon is provided, the default Electron icon will be used.

## Configuration

### Changing Default Installation Path

Edit `package.json` build configuration:

```json
{
  "build": {
    "msi": {
      "perMachine": true
    }
  }
}
```

### Changing Application Version

Update version in `package.json`:

```json
{
  "version": "1.0.0"
}
```

## Running After Installation

After installation, the application can be launched:

1. **Desktop shortcut** - "SLightSFTP Server"
2. **Start Menu** - Search for "SLightSFTP Server"
3. **Directly** - `C:\Program Files\SLightSFTP\bin\SLightSFTP.exe`

## Default Credentials

After first launch:
- **Username**: `admin`
- **Password**: `admin123`

## Troubleshooting

### Build Fails

1. Ensure all dependencies are installed:
   ```powershell
   npm install
   ```

2. Clean and rebuild:
   ```powershell
   Remove-Item -Path dist, release -Recurse -Force
   npm run build
   npm run dist:win
   ```

### MSI Installation Fails

1. Run as Administrator
2. Check Windows Event Viewer for detailed error messages
3. Ensure no other version is currently running

### Database Issues

If the database gets corrupted:
1. Close the application
2. Delete `C:\Program Files\SLightSFTP\config\config.db`
3. Restart the application (it will recreate with defaults)

## Ports

The application uses:
- **Port 22** - SFTP (requires admin privileges)
- **Port 21** - FTP (requires admin privileges)

## Security Note

The application requests administrator privileges during installation because:
1. Installing to `C:\Program Files` requires admin rights
2. Binding to ports 21 and 22 (standard ports) requires admin rights

## Additional Resources

- [electron-builder documentation](https://www.electron.build/)
- [WiX Toolset](https://wixtoolset.org/)
