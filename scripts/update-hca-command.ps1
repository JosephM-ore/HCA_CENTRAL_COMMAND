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

function Invoke-UpdateStep {
    param(
        [string]$Name,
        [string]$Command
    )

    Write-Host ""
    Write-Host "==> $Name" -ForegroundColor Cyan
    Write-Host "    $Command" -ForegroundColor DarkGray

    Write-HostEvent "UPDATE step started. Step=$Name Command=$Command"

    cmd.exe /c $Command

    if ($LASTEXITCODE -ne 0) {
        Write-HostEvent "UPDATE step failed. Step=$Name ExitCode=$LASTEXITCODE"
        throw "Step failed: $Name"
    }

    Write-HostEvent "UPDATE step completed. Step=$Name"
}

Write-HostEvent "UPDATE requested."

if (-not (Test-Path $AppPath)) {
    Write-HostEvent "UPDATE failed. App path not found at $AppPath"
    Write-Host "App path not found:" -ForegroundColor Red
    Write-Host "  $AppPath" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $SharedRoot)) {
    Write-HostEvent "UPDATE failed. Shared root not found at $SharedRoot"
    Write-Host "Shared root not found:" -ForegroundColor Red
    Write-Host "  $SharedRoot" -ForegroundColor Yellow
    exit 1
}

Ensure-Directory -Path $SharedLogsPath

Set-Location $AppPath

try {
    Invoke-UpdateStep -Name "Check git status" -Command "git status --short"

    Invoke-UpdateStep -Name "Pull latest code" -Command "git pull --ff-only"

    Invoke-UpdateStep -Name "Install dependencies" -Command "npm install"

    Invoke-UpdateStep -Name "Generate Prisma client" -Command "npx prisma generate"

    Invoke-UpdateStep -Name "Sync Prisma schema to local database" -Command "npx prisma db push"

    Invoke-UpdateStep -Name "Build Next.js app" -Command "npm run build"

    $gitCommit = "unknown"

    try {
        $gitCommit = (cmd.exe /c "git rev-parse --short HEAD").Trim()
    } catch {
        $gitCommit = "unknown"
    }

    Write-HostEvent "UPDATE completed successfully. GitCommit=$gitCommit"

    Write-Host ""
    Write-Host "HCA Central Command update completed successfully." -ForegroundColor Green
    Write-Host "Current git commit: $gitCommit" -ForegroundColor Cyan
} catch {
    Write-HostEvent "UPDATE failed. Error=$($_.Exception.Message)"

    Write-Host ""
    Write-Host "HCA Central Command update failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The app was not started. Fix the update/build issue before hosting HCA." -ForegroundColor Yellow

    exit 1
}