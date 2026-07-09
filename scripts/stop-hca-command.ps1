Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDirectory "hca-host.config.ps1"
$BackupScriptPath = Join-Path $ScriptDirectory "backup-db.ps1"

if (-not (Test-Path $ConfigPath)) {
    Write-Host "Missing config file:" -ForegroundColor Red
    Write-Host "  $ConfigPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Copy scripts\hca-host.config.example.ps1 to scripts\hca-host.config.ps1 and update the paths." -ForegroundColor Yellow
    exit 1
}

. $ConfigPath

function Ensure-Directory {
    param(
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Write-HostEvent {
    param(
        [string]$Message
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $machine = $env:COMPUTERNAME
    $entry = "$timestamp [$machine] $Message"

    Write-Host $entry

    Ensure-Directory -Path $SharedLogsPath
    Add-Content -Path $HostEventsLogPath -Value $entry
}

Write-HostEvent "STOP requested."

if (-not (Test-Path $SharedRoot)) {
    Write-HostEvent "STOP failed. Shared root not found at $SharedRoot"
    Write-Host "Shared root not found:" -ForegroundColor Red
    Write-Host "  $SharedRoot" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $ActiveHostPath)) {
    Write-HostEvent "STOP refused. active-host.json not found."
    Write-Host "No active-host.json file found." -ForegroundColor Yellow
    Write-Host "Refusing to stop to avoid stopping the wrong process." -ForegroundColor Yellow
    exit 1
}

try {
    $activeHostState = Get-Content -Path $ActiveHostPath -Raw | ConvertFrom-Json
} catch {
    Write-HostEvent "STOP failed. Could not parse active-host.json. Error=$($_.Exception.Message)"
    Write-Host "Could not parse active-host.json." -ForegroundColor Red
    exit 1
}

$currentMachine = $env:COMPUTERNAME

if ($activeHostState.status -ne "RUNNING") {
    Write-HostEvent "STOP refused. Active host status is not RUNNING. Status=$($activeHostState.status)"
    Write-Host "HCA is not marked as running." -ForegroundColor Yellow
    Write-Host "Current status: $($activeHostState.status)" -ForegroundColor Yellow
    exit 0
}

if ($activeHostState.activeHost -ne $currentMachine) {
    Write-HostEvent "STOP refused. Current machine is not active host. ActiveHost=$($activeHostState.activeHost) CurrentMachine=$currentMachine"
    Write-Host "This machine is not the active HCA host." -ForegroundColor Yellow
    Write-Host "Active host: $($activeHostState.activeHost)" -ForegroundColor Cyan
    Write-Host "URL: $($activeHostState.url)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Nothing was stopped." -ForegroundColor Yellow
    exit 0
}

if (-not (Test-Path $BackupScriptPath)) {
    Write-HostEvent "STOP failed. Backup script not found at $BackupScriptPath"
    Write-Host "Backup script not found:" -ForegroundColor Red
    Write-Host "  $BackupScriptPath" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Backing up database before stopping HCA..." -ForegroundColor Cyan

powershell.exe -ExecutionPolicy Bypass -File $BackupScriptPath -Reason "stop-hosting"

if ($LASTEXITCODE -ne 0) {
    Write-HostEvent "STOP failed. Backup step failed. ExitCode=$LASTEXITCODE"
    Write-Host "Backup failed. HCA was not stopped." -ForegroundColor Red
    Write-Host "Fix the backup issue before stopping to avoid losing handoff state." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Stopping local HCA process on port $Port..." -ForegroundColor Cyan

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if ($connections) {
    $owningProcesses = $connections | Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($processId in $owningProcesses) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            Write-HostEvent "STOP stopping process. ProcessId=$processId ProcessName=$($process.ProcessName)"
            Stop-Process -Id $processId -Force
        } catch {
            Write-HostEvent "STOP warning. Could not stop process. ProcessId=$processId Error=$($_.Exception.Message)"
        }
    }
} else {
    Write-HostEvent "STOP no local process found listening on port $Port"
    Write-Host "No local process found listening on port $Port." -ForegroundColor Yellow
}

$now = (Get-Date).ToUniversalTime().ToString("o")

$stoppedHostJson = [ordered]@{
    status = "STOPPED"
    lastActiveHost = $currentMachine
    lastUrl = $activeHostState.url
    stoppedAt = $now
    lastBackupPath = $SharedLatestDatabasePath
} | ConvertTo-Json -Depth 5

$stoppedHostJson | Set-Content -Path $ActiveHostPath -Encoding UTF8

Write-HostEvent "STOP completed. LastActiveHost=$currentMachine LastBackupPath=$SharedLatestDatabasePath"

Write-Host ""
Write-Host "HCA Central Command stopped successfully." -ForegroundColor Green
Write-Host "Database backup saved to:" -ForegroundColor Cyan
Write-Host "  $SharedLatestDatabasePath"