# Icon Setup Instructions

## Quick Setup

1. **Save the SLight FTP/SFTP icon** that was provided to:
   ```
   assets\icon-source.png
   ```

2. **Run the setup script**:
   ```powershell
   .\setup-icon.ps1
   ```

   This will automatically:
   - Copy the icon to all required locations
   - Generate ICO format for Windows installer
   - Set up icons for application windows and system tray

3. **Rebuild the application**:
   ```powershell
   npm run build
   ```

4. **Build new MSI installer** (optional):
   ```powershell
   npm run dist:win
   ```

## Manual Setup (if script fails)

If the automated script doesn't work, manually save the icon to these locations:

1. **Application Icon**: `assets\icon.png` (PNG format)
2. **MSI Installer Icon**: `build\icon.ico` (ICO format)
3. **Packaged Resources**: `resources\icon.png` (PNG format)

### Converting PNG to ICO

You can use online tools or the included icon-gen package:
```powershell
npx icon-gen -i assets\icon-source.png -o build --ico
```

## Icon Specifications

- **Format**: PNG (for app), ICO (for installer)
- **Recommended Size**: 256x256 or 512x512 pixels
- **Transparency**: Supported
- **Color**: Full color (32-bit)

## Where the Icon is Used

The icon appears in:
- ✅ Login window title bar
- ✅ Main dashboard window title bar
- ✅ System tray icon (Windows taskbar)
- ✅ MSI installer wizard
- ✅ Windows Start Menu shortcuts
- ✅ Desktop shortcut
- ✅ Application executable

## Troubleshooting

### Icon not showing in application
- Ensure `assets\icon.png` exists
- Rebuild with `npm run build`
- Restart the application

### Icon not showing in MSI installer
- Ensure `build\icon.ico` exists
- Rebuild MSI with `npm run dist:win`

### Tray icon appears blank
- Check console for warnings about icon path
- Verify `assets\icon.png` is a valid PNG file
- Try restarting the application
