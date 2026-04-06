<#
dev.ps1 - start Nova Drive (PowerShell-friendly)
- If Docker is available it runs `docker compose up --build -d`
- Otherwise it starts the API with `dotnet run --project final`
- Waits for the web app and opens it in the browser automatically
Usage: .\dev.ps1
#>

Write-Host "Starting Nova Drive development stack..." -ForegroundColor Cyan

$siteUrl = "http://localhost:5173"

function Wait-For-Url {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [int]$TimeoutSeconds = 180
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }

    return $false
}

function Start-Backend-With-Docker {
    Write-Host "Docker detected - starting full compose stack (detached)..." -ForegroundColor Green
    docker compose up --build -d
}

function Start-Backend-Standalone {
    Write-Host "Docker not found - launching backend with 'dotnet run' in background" -ForegroundColor Yellow

    # If a previous 'final' process is running it can lock the apphost exe and break rebuilds.
    # Stop any running instance to avoid the "file is being used by another process" build error.
    $existing = Get-Process -Name 'final' -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Stopping existing 'final' process (PID(s): $($existing.Id -join ', '))" -ForegroundColor Yellow
        $existing | Stop-Process -Force
        Start-Sleep -Seconds 1
    }

    Start-Process -FilePath "dotnet" -ArgumentList "run --project final" -WorkingDirectory $PWD
}

function Start-Frontend {
    $frontendDir = Join-Path $PWD 'website tests'

    if (Get-Command bun -ErrorAction SilentlyContinue) {
        Write-Host "Starting frontend with Bun (background)..." -ForegroundColor Green
        Start-Process -FilePath "bun" -ArgumentList "run dev" -WorkingDirectory $frontendDir
    } else {
        Write-Host "Starting frontend with npm (background)..." -ForegroundColor Yellow
        Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory $frontendDir
    }
}

# Main
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Start-Backend-With-Docker
} else {
    Start-Backend-Standalone
    Start-Frontend
}

Write-Host "Waiting for the web app to become available at $siteUrl ..." -ForegroundColor Cyan
if (Wait-For-Url -Url $siteUrl) {
    Write-Host "Opening browser to $siteUrl" -ForegroundColor Green
    Start-Process $siteUrl
} else {
    Write-Host "Web app did not become available in time. Open $siteUrl manually." -ForegroundColor Yellow
}

Write-Host "Dev helper completed." -ForegroundColor Cyan
