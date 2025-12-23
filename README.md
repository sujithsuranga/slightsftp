# SLightSFTP

Multi-user FTP/SFTP server with GUI management interface.

## Features

- Multiple FTP/SFTP listeners
- Multi-user support with password and public key authentication
- Virtual path mapping
- Granular permissions per user
- Electron-based GUI for configuration and monitoring
- SQLite database for configuration storage
- System tray support

## Installation

```bash
npm install
```

## Usage

```bash
# Start the application
npm start

# Run test client
npm test
```

## Default Credentials

- Username: `admin`
- Password: `admin123`

## Configuration

All configurations are stored in SQLite database (`config.db`).

### User Configuration

- Username
- Password (optional)
- Public key (optional)
- Subscribed listeners
- GUI access
- Virtual path mappings
- Permissions

### Server Configuration

- Protocol (FTP/SFTP)
- Binding IP
- Port
- Enable/Disable

## Development

```bash
npm run dev
```
