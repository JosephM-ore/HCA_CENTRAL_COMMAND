Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDirectory "hca-host.config.ps1"

$StartScriptPath = Join-Path $ScriptDirectory "start-hca-command.ps1"
$StopScriptPath = Join-Path $ScriptDirectory "stop-hca-command.ps1"
$BackupScriptPath = Join-Path $ScriptDirectory "backup-db.ps1"
$UpdateScriptPath = Join-Path $ScriptDirectory "update-hca-command.ps1"
$TakeoverScriptPath = Join-Path $ScriptDirectory "takeover-host.ps1"

if (-not (Test-Path $ConfigPath)) {
    [System.Windows.Forms.MessageBox]::Show(
        "Missing config file:`n`n$ConfigPath`n`nCopy scripts\hca-host.config.example.ps1 to scripts\hca-host.config.ps1 and update the paths.",
        "HCA Central Command",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null

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

    try {
        Ensure-Directory -Path $SharedLogsPath
        Add-Content -Path $HostEventsLogPath -Value $entry
    } catch {
        # Do not crash launcher if logging fails.
    }
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

function Get-LocalUrl {
    $hostName = $env:COMPUTERNAME
    return "http://$hostName`:$Port"
}

function Get-ActiveHostState {
    if (-not (Test-Path $ActiveHostPath)) {
        return $null
    }

    try {
        return Get-Content -Path $ActiveHostPath -Raw | ConvertFrom-Json
    } catch {
        return [pscustomobject]@{
            status = "ERROR"
            message = "Could not parse active-host.json"
        }
    }
}

function Invoke-HcaScript {
    param(
        [string]$ScriptPath,
        [string]$DisplayName,
        [string[]]$Arguments = @()
    )

    if (-not (Test-Path $ScriptPath)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Missing script:`n`n$ScriptPath",
            "HCA Central Command",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null

        return
    }

    Write-HostEvent "LAUNCHER invoking script. Name=$DisplayName Path=$ScriptPath"

    $argumentList = @(
        "-NoExit",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "`"$ScriptPath`""
    ) + $Arguments

    Start-Process powershell.exe -ArgumentList $argumentList
}

function Open-Url {
    param(
        [string]$Url
    )

    if (:IsNullOrWhiteSpace($Url)) {
        [System.Windows.Forms.MessageBox]::Show(
            "No HCA URL is currently available.",
            "HCA Central Command",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null

        return
    }

    Start-Process $Url
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "HCA Central Command Launcher"
$form.Size = New-Object System.Drawing.Size(640, 520)
$form.StartPosition = "CenterScreen"
$form.MinimumSize = New-Object System.Drawing.Size(640, 520)

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "HCA Central Command"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(24, 20)
$form.Controls.Add($titleLabel)

$subtitleLabel = New-Object System.Windows.Forms.Label
$subtitleLabel.Text = "Personal Machine Active Host Launcher"
$subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$subtitleLabel.AutoSize = $true
$subtitleLabel.Location = New-Object System.Drawing.Point(28, 58)
$form.Controls.Add($subtitleLabel)

$statusBox = New-Object System.Windows.Forms.TextBox
$statusBox.Multiline = $true
$statusBox.ReadOnly = $true
$statusBox.ScrollBars = "Vertical"
$statusBox.Font = New-Object System.Drawing.Font("Consolas", 10)
$statusBox.Location = New-Object System.Drawing.Point(28, 90)
$statusBox.Size = New-Object System.Drawing.Size(570, 165)
$form.Controls.Add($statusBox)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "Start / Open HCA"
$startButton.Location = New-Object System.Drawing.Point(28, 280)
$startButton.Size = New-Object System.Drawing.Size(175, 40)
$form.Controls.Add($startButton)

$openButton = New-Object System.Windows.Forms.Button
$openButton.Text = "Open App"
$openButton.Location = New-Object System.Drawing.Point(220, 280)
$openButton.Size = New-Object System.Drawing.Size(175, 40)
$form.Controls.Add($openButton)

$refreshButton = New-Object System.Windows.Forms.Button
$refreshButton.Text = "Refresh Status"
$refreshButton.Location = New-Object System.Drawing.Point(412, 280)
$refreshButton.Size = New-Object System.Drawing.Size(175, 40)
$form.Controls.Add($refreshButton)

$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = "Stop Hosting"
$stopButton.Location = New-Object System.Drawing.Point(28, 335)
$stopButton.Size = New-Object System.Drawing.Size(175, 40)
$form.Controls.Add($stopButton)

$backupButton = New-Object System.Windows.Forms.Button
$backupButton.Text = "Backup Now"
$backupButton.Location = New-Object System.Drawing.Point(220, 335)
$backupButton.Size = New-Object System.Drawing.Size(175, 40)
$form.Controls.Add($backupButton)

$updateButton = New-Object System.Windows.Forms.Button
$updateButton.Text = "Check For Updates"
$updateButton.Location = New-Object System.Drawing.Point(412, 335)
$updateButton.Size = New-Object System.Drawing.Size(175, 40)
$form.Controls.Add($updateButton)

$takeoverButton = New-Object System.Windows.Forms.Button
$takeoverButton.Text = "Emergency Takeover"
$takeoverButton.Location = New-Object System.Drawing.Point(28, 390)
$takeoverButton.Size = New-Object System.Drawing.Size(175, 40)
$form.Controls.Add($takeoverButton)

$logsButton = New-Object System.Windows.Forms.Button
$logsButton.Text = "View Logs"
$logsButton.Location = New-Object System.Drawing.Point(220