# Create HCA Central Command desktop shortcut

$RepoRoot = Split-Path $PSScriptRoot -Parent

$Target = Join-Path $PSScriptRoot "Launch-HCA.vbs"
$Icon = Join-Path $RepoRoot "assets\hca.ico"

$Desktop = [System.Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "HCA Central Command.lnk"

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)

$Shortcut.TargetPath = $Target
$Shortcut.WorkingDirectory = $RepoRoot
$Shortcut.IconLocation = $Icon
$Shortcut.Description = "HCA Central Command Launcher"

$Shortcut.Save()

Write-Host "Shortcut created:"
Write-Host $ShortcutPath