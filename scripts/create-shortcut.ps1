Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Create or replace the HCA Central Command desktop shortcut.

$RepoRoot = Split-Path -Parent $PSScriptRoot

$LauncherPath = Join-Path $PSScriptRoot "Launch-HCA.vbs"
$IconPath = Join-Path $RepoRoot "assets\hcaV2.ico"

$DesktopPath = [System.Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "HCA Central Command.lnk"

if (-not (Test-Path $LauncherPath)) {
    throw "HCA launcher was not found: $LauncherPath"
}

if (-not (Test-Path $IconPath)) {
    throw "HCA icon was not found: $IconPath"
}

# Remove the existing shortcut so Windows does not retain its old settings.
if (Test-Path $ShortcutPath) {
    Remove-Item -Path $ShortcutPath -Force
}

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)

$Shortcut.TargetPath = "$env:SystemRoot\System32\wscript.exe"
$Shortcut.Arguments = "`"$LauncherPath`""
$Shortcut.WorkingDirectory = $RepoRoot
$Shortcut.IconLocation = "$IconPath,0"
$Shortcut.Description = "HCA Central Command Launcher"

$Shortcut.Save()

# Ask Windows Explorer to refresh its icon cache.
Start-Process `
    -FilePath "$env:SystemRoot\System32\ie4uinit.exe" `
    -ArgumentList "-show" `
    -WindowStyle Hidden `
    -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "HCA Central Command shortcut installed successfully." -ForegroundColor Green
Write-Host "Shortcut: $ShortcutPath"
Write-Host "Launcher: $LauncherPath"
Write-Host "Icon:     $IconPath"