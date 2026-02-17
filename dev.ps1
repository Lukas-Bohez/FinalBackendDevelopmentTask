<#
dev.ps1 - start Nova Drive (PowerShell-friendly)
- If Docker is available it runs `docker compose up --build -d`
- Otherwise it starts the API with `dotnet run --project final`
- Opens a new PowerShell window and runs the website dev server (bun or npm)
Usage: .\dev.ps1
#>

Write-Host "Starting Nova Drive development stack..." -ForegroundColor Cyan

function Start-Backend-With-Docker {
    Write-Host "Docker detected - starting docker compose (detached)..." -ForegroundColor Green
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
}

Start-Frontend

Write-Host "Dev helper started - backend may be running in Docker or a separate window. Frontend running in a new window." -ForegroundColor Cyan
