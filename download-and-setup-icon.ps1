# Quick Icon Downloader
# This script helps download and set up the SLight FTP icon

Write-Host "=== SLight FTP/SFTP Icon Downloader ===" -ForegroundColor Cyan
Write-Host ""

# Create directories
$dirs = @("assets", "build", "resources")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

# Option 1: Manual save instructions
Write-Host "MANUAL SETUP (Recommended):" -ForegroundColor Green
Write-Host "1. Right-click on the icon image in your browser/file" -ForegroundColor White
Write-Host "2. Select 'Save Image As...'" -ForegroundColor White
Write-Host "3. Save it to: $(Get-Location)\assets\icon-source.png" -ForegroundColor Yellow
Write-Host "4. Then run: .\setup-icon.ps1" -ForegroundColor Yellow
Write-Host ""

# Check if file already exists
if (Test-Path "assets\icon-source.png") {
    Write-Host "✓ Icon source file found!" -ForegroundColor Green
    Write-Host ""
    $response = Read-Host "Do you want to run setup now? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        .\setup-icon.ps1
    }
} else {
    Write-Host "Waiting for icon file..." -ForegroundColor Yellow
    Write-Host "Press any key once you've saved the icon to assets\icon-source.png"
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    if (Test-Path "assets\icon-source.png") {
        Write-Host "✓ Icon file detected! Running setup..." -ForegroundColor Green
        .\setup-icon.ps1
    } else {
        Write-Host "✗ Icon file not found. Please save it and run: .\setup-icon.ps1" -ForegroundColor Red
    }
}
