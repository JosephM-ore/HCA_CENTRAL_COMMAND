Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDirectory "hca-host.config.ps1"
$BackupScriptPath = Join-Path $ScriptDirectory "backup-db.ps1"

if (-not (Test-Path $ConfigPath)) {
    Write-Host "Missing config file:" -ForegroundColor Red
    Write-Host "  $ConfigPath" -ForegroundColor Yellow
    exit 1
}

. $ConfigPath

$LatestBackupIntervalSeconds = 5 * 60
$TimestampedBackupIntervalSeconds = 30 * 60
$LoopSleepSeconds = 60

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

    try {
        Ensure-Directory -Path $SharedLogsPath
        Add-Content -Path $HostEventsLogPath -Value $entry
    } catch {
        # Avoid crashing the periodic backup loop only because logging failed.
    }
}

function Get-ActiveHostState {
    if (-not (Test-Path $ActiveHostPath)) {
        return $null
    }

    try {
        return Get-Content -Path $ActiveHostPath -Raw | ConvertFrom-Json
    } catch {
        Write-HostEvent "PERIODIC_BACKUP warning. Could not parse active-host.json. Error=$($_.Exception.Message)"
        return $null
    }
}

function Test-ThisMachineIsActiveHost {
    $state = Get-ActiveHostState

    if (-not $state) {
        return $false
    }

    if ($state.status -ne "RUNNING") {
        return $false
    }

    if ($state.activeHost -ne $env:COMPUTERNAME) {
        return $false
    }

    return $true
}

Write-HostEvent "PERIODIC_BACKUP started."

if (-not (Test-Path $BackupScriptPath)) {
    Write-HostEvent "PERIODIC_BACKUP failed. Backup script not found at $BackupScriptPath"
    exit 1
}

$lastLatestBackupAt = Get-Date "2000-01-01"
$lastTimestampedBackupAt = Get-Date "2000-01-01"

while ($true) {
    if (-not (Test-ThisMachineIsActiveHost)) {
        Write-HostEvent "PERIODIC_BACKUP exiting. This machine is no longer active host."
        exit 0
    }

    $now = Get-Date
    $secondsSinceLatest = ($now - $lastLatestBackupAt).TotalSeconds
    $secondsSinceTimestamped = ($now - $lastTimestampedBackupAt).TotalSeconds

    try {
        if ($secondsSinceLatest -ge $LatestBackupIntervalSeconds) {
            Write-HostEvent "PERIODIC_BACKUP running latest-only backup."

            powershell.exe -ExecutionPolicy Bypass -File $BackupScriptPath -Reason "periodic-latest" -LatestOnly

            if ($LASTEXITCODE -eq 0) {
                $lastLatestBackupAt = Get-Date
            } else {
                Write-HostEvent "PERIODIC_BACKUP latest-only backup failed. ExitCode=$LASTEXITCODE"
            }
        }

        if ($secondsSinceTimestamped -ge $TimestampedBackupIntervalSeconds) {
            Write-HostEvent "PERIODIC_BACKUP running timestamped backup."

            powershell.exe -ExecutionPolicy Bypass -File $BackupScriptPath -Reason "periodic-timestamped"

            if ($LASTEXITCODE -eq 0) {
                $lastTimestampedBackupAt = Get-Date
                $lastLatestBackupAt = Get-Date
            } else {
                Write-HostEvent "PERIODIC_BACKUP timestamped backup failed. ExitCode=$LASTEXITCODE"
            }
        }
    } catch {
        Write-HostEvent "PERIODIC_BACKUP error. Error=$($_.Exception.Message)"
    }

    Start-Sleep -Seconds $LoopSleepSeconds
}
