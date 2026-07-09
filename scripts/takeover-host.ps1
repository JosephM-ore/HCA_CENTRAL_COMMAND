Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDirectory "hca-host.config.ps1"
$UpdateScriptPath = Join-Path $ScriptDirectory "update-hca-command.ps1"

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

function Test-HcaHealth {
    param(
        [string]$Url
    )

    try {
        $healthUrl = "$Url/api/health"
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5

        if ($response.StatusCode -eq 200) {
            return $true
        }

        return $false
    } catch {
        return $false
    }
}

function Get-GitCommit {
    try {
        Set-Location $AppPath
        $commit = (cmd.exe /c "git rev-parse --short HEAD").Trim()
        if ($commit) {
            return $commit
        }

        return "unknown"
    } catch {
        return "unknown"
    }
}

function Get-LocalUrl {
    $hostName = $env:COMPUTERNAME
    return "http://$hostName`:$Port"
}

Write-HostEvent "TAKEOVER requested."

if (-not (Test-Path $AppPath)) {
    Write-HostEvent "TAKEOVER failed. App path not found at $AppPath"
    Write-Host "App path not found:" -ForegroundColor Red
    Write-Host "  $AppPath" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $SharedRoot)) {
    Write-HostEvent "TAKEOVER failed. Shared root not found at $SharedRoot"
    Write-Host "Shared root not found:" -ForegroundColor Red
    Write-Host "  $SharedRoot" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Takeover was not allowed because the shared coordination folder is unavailable." -ForegroundColor Yellow
    exit 1
}

Ensure-Directory -Path $SharedLatestDirectory
Ensure-Directory -Path $SharedBackupsPath
Ensure-Directory -Path $SharedLogsPath

$activeHostState = $null

if (Test-Path $ActiveHostPath) {
    try {
        $activeHostState = Get-Content -Path $ActiveHostPath -Raw | ConvertFrom-Json
    } catch {
        Write-HostEvent "TAKEOVER failed. Could not parse active-host.json. Error=$($_.Exception.Message)"
        Write-Host "Could not parse active-host.json." -ForegroundColor Red
        Write-Host "Refusing takeover to avoid active-host confusion." -ForegroundColor Yellow
        exit 1
    }
}

if ($activeHostState -and $activeHostState.status -eq "RUNNING" -and $activeHostState.url) {
    $activeUrl = [string]$activeHostState.url
    $activeHost = [string]$activeHostState.activeHost

    Write-HostEvent "TAKEOVER detected listed active host. Host=$activeHost Url=$activeUrl"

    if (Test-HcaHealth -Url $activeUrl) {
        Write-Host ""
        Write-Host "Takeover refused because the current active host is healthy." -ForegroundColor Green
        Write-Host "Active host: $activeHost" -ForegroundColor Cyan
        Write-Host "Opening: $activeUrl" -ForegroundColor Yellow

        Write-HostEvent "TAKEOVER refused. Active host healthy. Host=$activeHost Url=$activeUrl"

        Start-Process $activeUrl
        exit 0
    }

    Write-Host ""
    Write-Host "WARNING: Previous active host is listed but not reachable." -ForegroundColor Yellow
    Write-Host "Previous host: $activeHost" -ForegroundColor Yellow
    Write-Host "Previous URL:  $activeUrl" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "No healthy active host is listed." -ForegroundColor Cyan
}

if (-not (Test-Path $SharedLatestDatabasePath)) {
    Write-HostEvent "TAKEOVER failed. Latest shared database backup not found at $SharedLatestDatabasePath"
    Write-Host ""
    Write-Host "Latest shared database backup was not found." -ForegroundColor Red
    Write-Host "Expected:" -ForegroundColor Yellow
    Write-Host "  $SharedLatestDatabasePath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Takeover cannot continue without a handoff database." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Emergency takeover will make this machine the active HCA host." -ForegroundColor Yellow
Write-Host "This should only be done if the previous active host is offline or unavailable." -ForegroundColor Yellow
Write-Host ""
Write-Host "The local database will be replaced with:" -ForegroundColor Yellow
Write-Host "  $SharedLatestDatabasePath" -ForegroundColor Cyan
Write-Host ""

$confirmation = Read-Host "Type TAKEOVER to continue"

if ($confirmation -ne "TAKEOVER") {
    Write-HostEvent "TAKEOVER cancelled by user."
    Write-Host "Takeover cancelled." -ForegroundColor Yellow
    exit 0
}

$localDataDirectory = Split-Path -Parent $LocalDatabasePath
Ensure-Directory -Path $localDataDirectory

Copy-Item -Path $SharedLatestDatabasePath -Destination $LocalDatabasePath -Force

Write-HostEvent "TAKEOVER copied shared latest DB to local DB. Source=$SharedLatestDatabasePath Destination=$LocalDatabasePath"
Write-Host "Copied latest shared database backup into local data directory." -ForegroundColor Green

if (-not (Test-Path $UpdateScriptPath)) {
    Write-HostEvent "TAKEOVER failed. Update script not found at $UpdateScriptPath"
    Write-Host "Update script not found:" -ForegroundColor Red
    Write-Host "  $UpdateScriptPath" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Updating HCA before takeover hosting..." -ForegroundColor Cyan

powershell.exe -ExecutionPolicy Bypass -File $UpdateScriptPath

if ($LASTEXITCODE -ne 0) {
    Write-HostEvent "TAKEOVER failed. Update script failed. ExitCode=$LASTEXITCODE"
    Write-Host "Update failed. HCA was not started." -ForegroundColor Red
    exit 1
}

Set-Location $AppPath

$localUrl = Get-LocalUrl

$existingConnection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if ($existingConnection) {
    Write-HostEvent "TAKEOVER found local port already listening. Port=$Port"
    Write-Host "Something is already listening on port $Port." -ForegroundColor Yellow
    Write-Host "Opening local URL: $localUrl" -ForegroundColor Yellow
    Start-Process $localUrl
    exit 0
}

Write-Host ""
Write-Host "Starting HCA Central Command locally after takeover..." -ForegroundColor Cyan

Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "cd '$AppPath'; npm run start"

$healthOk = $false

for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 2

    if (Test-HcaHealth -Url $localUrl) {
        $healthOk = $true
        break
    }

    Write-Host "Waiting for HCA to become healthy... ($i/30)" -ForegroundColor DarkGray
}

if (-not $healthOk) {
    Write-HostEvent "TAKEOVER failed. Local app did not become healthy. Url=$localUrl"
    Write-Host "HCA did not become healthy after takeover start." -ForegroundColor Red
    Write-Host "Check the server window and logs." -ForegroundColor Yellow
    exit 1
}

$gitCommit = Get-GitCommit
$now = (Get-Date).ToUniversalTime().ToString("o")

$activeHostJson = [ordered]@{
    status = "RUNNING"
    activeHost = $env:COMPUTERNAME
    url = $localUrl
    startedAt = $now
    databaseMode = "LOCAL_ACTIVE_HOST"
    gitCommit = $gitCommit
    lastBackupPath = $SharedLatestDatabasePath
    takeover = $true
    takeoverAt = $now
} | ConvertTo-Json -Depth 5

$activeHostJson | Set-Content -Path $ActiveHostPath -Encoding UTF8

Write-HostEvent "TAKEOVER completed. ActiveHost=$env:COMPUTERNAME Url=$localUrl GitCommit=$gitCommit"

Write-Host ""
Write-Host "Emergency takeover completed." -ForegroundColor Green
Write-Host "HCA Central Command is now running on this machine." -ForegroundColor Green
Write-Host "Opening: $localUrl" -ForegroundColor Yellow

Start-Process $localUrl