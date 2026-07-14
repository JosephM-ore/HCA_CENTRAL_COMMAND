# HCA Central Command host configuration example.
# Copy this file to:
#   scripts/hca-host.config.ps1
#
# Then update the paths for the local machine and shared drive.
#
# IMPORTANT:
# - The live SQLite database should stay local to the active host.
# - The shared drive should store backups, logs, and active-host metadata only.

$AppPath = "C:\HCA-Central-Command"

$SharedRoot = "C:\Users\jmoore\OneDrive - Sunwest Bank\Desktop\HCA-Shared-Test"

$Port = 3000

$AppName = "hca-central-command"

$LocalDatabasePath = "C:\HCA-Central-Command\data\prod.db"

$SharedLatestDirectory = "\\SharedDrive\HCA-Central-Command\latest"
$SharedLatestDatabasePath = "\\SharedDrive\HCA-Central-Command\latest\latest.db"

$SharedBackupsPath = "\\SharedDrive\HCA-Central-Command\backups"
$SharedLogsPath = "\\SharedDrive\HCA-Central-Command\logs"

$ActiveHostPath = "\\SharedDrive\HCA-Central-Command\active-host.json"
$HostEventsLogPath = "\\SharedDrive\HCA-Central-Command\logs\host-events.log"