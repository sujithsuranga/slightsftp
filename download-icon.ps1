# Download the SLight FTP/SFTP icon
# The user has provided an icon image that needs to be saved

$iconUrl = "https://raw.githubusercontent.com/user-attachments/assets/provided-icon.png"
$outputPath = "assets\icon.png"

Write-Host "Please save the provided icon image manually to: $outputPath"
Write-Host "The icon should be saved as a PNG file for best compatibility."
Write-Host ""
Write-Host "For Windows ICO format (for MSI installer):"
Write-Host "Save to: build\icon.ico"
