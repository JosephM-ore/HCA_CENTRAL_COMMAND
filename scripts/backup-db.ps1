param(
    [string]$Reason = "manual"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDirectory "hca-host.config.ps1"

if (-not (Test-Path $ConfigPath)) {
    Write-Host "Missing config file:" -ForegroundColor Red
    Write-Host "  $ConfigPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Copy scripts\hca-host.config.example.ps1 to scripts\hca-host.config.ps1 and update the paths." -ForegroundColor Yellow
    exit 1
}

. $ConfigPath

function Write-HostEvent {
    param(
        [string]$Message
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $machine = $env:COMPUTERNAME
    $entry = "$timestamp [$machine] $Message"

    Write-Host $entry

    if (-not (Test-Path $SharedLogsPath)) {
        New-Item -ItemType Directory -Path $SharedLogsPath -Force | Out-Null
    }

    Add-Content -Path $HostEventsLogPath -Value $entry
}

Write-HostEvent "BACKUP requested. Reason=$Reason"

if (-not (Test-Path $LocalDatabasePath)) {
    Write-HostEvent "BACKUP failed. Local database not found at $LocalDatabasePath"
    Write-Host "Local database not found:" -ForegroundColor Red
    Write-Host "  $LocalDatabasePath" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $SharedRoot)) {
    Write-HostEvent "BACKUP failed. Shared root not found at $SharedRoot"
    Write-Host "Shared root not found:" -ForegroundColor Red
    Write-Host "  $SharedRoot" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $SharedLatestDirectory)) {
    New-Item -ItemType Directory -Path $SharedLatestDirectory -Force | Out-Null
}

if (-not (Test-Path $SharedBackupsPath)) {
    New-Item -ItemType Directory -Path $SharedBackupsPath -Force | Out-Null
}

$timestampForFile = Get-Date -Format "yyyyMMdd-HHmmss"
$timestampedBackupPath = Join-Path $SharedBackupsPath "prod-$timestampForFile.db"

try {
    Copy-Item -Path $LocalDatabasePath -Destination $SharedLatestDatabasePath -Force
    Copy-Item -Path $LocalDatabasePath -Destination $timestampedBackupPath -Force

    Write-HostEvent "BACKUP completed. Latest=$SharedLatestDatabasePath Timestamped=$timestampedBackupPath"

    Write-Host ""
    Write-Host "Database backup complete." -ForegroundColor Green
    Write-Host "Latest handoff DB:" -ForegroundColor Cyan
    Write-Host "  $SharedLatestDatabasePath"
    Write-Host "Timestamped backup:" -ForegroundColor Cyan
    Write-Host "  $timestampedBackupPath"
} catch {
    Write-HostEvent "BACKUP failed. Error=$($_.Exception.Message)"
    Write-Host "Backup failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}