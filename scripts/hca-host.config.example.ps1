# HCA Central Command host configuration example
#User should set their appPath and SharedRoot paths to whatever their set up is on their machine 
#All other lines in this file should remain untouched

$AppPath = Split-Path -Path $PSScriptRoot -Parent

$SharedRoot = "C:\Users\jmoore\OneDrive - Sunwest Bank\Desktop\HCA-Shared-Database"

$Port = 3000

$AppName = "hca-central-command"

$LocalDatabasePath = "$AppPath\data\prod.db"

$SharedLatestDirectory = "$SharedRoot\latest"
$SharedLatestDatabasePath = "$SharedLatestDirectory\latest.db"

$SharedBackupsPath = "$SharedRoot\backups"
$SharedLogsPath = "$SharedRoot\logs"

$ActiveHostPath = "$SharedRoot\active-host.json"
$HostEventsLogPath = "$SharedLogsPath\host-events.log"