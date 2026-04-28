$ErrorActionPreference = "Stop"

function Write-Info($message) { Write-Host "[INFO] $message" -ForegroundColor Cyan }
function Write-Ok($message) { Write-Host "[OK]   $message" -ForegroundColor Green }
function Write-Warn($message) { Write-Host "[WARN] $message" -ForegroundColor Yellow }
function Write-Err($message) { Write-Host "[ERR]  $message" -ForegroundColor Red }

Set-Location $PSScriptRoot

function Test-DockerReady {
    try {
        & docker info *> $null
        return ($LASTEXITCODE -eq 0)
    }
    catch {
        return $false
    }
}

function Ensure-DockerInstalled {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Ok "Docker is installed"
        return
    }

    Write-Warn "Docker is not installed. Install Docker Desktop from:"
    Write-Warn "https://www.docker.com/products/docker-desktop/"
    Write-Warn "Rerun .\\bootstrap.ps1 after installation."
    exit 0
}

function Start-DockerDesktop {
    if (Test-DockerReady) {
        Write-Ok "Docker daemon already running"
        return
    }

    Write-Info "Starting Docker Desktop"
    $dockerDesktopCandidates = @(
        (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Docker\Docker\Docker Desktop.exe")
    )

    $dockerDesktopPath = $dockerDesktopCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($dockerDesktopPath) {
        Start-Process -FilePath $dockerDesktopPath | Out-Null
    }
    else {
        Start-Process "Docker Desktop" -ErrorAction SilentlyContinue | Out-Null
    }

    for ($i = 1; $i -le 60; $i++) {
        if (Test-DockerReady) {
            Write-Ok "Docker daemon is ready"
            return
        }
        Write-Host "`rWaiting for Docker... ${i}s/60s" -NoNewline
        Start-Sleep -Seconds 1
    }

    Write-Host ""
    Write-Err "Docker did not become ready in time"
    exit 1
}

function Ensure-Compose {
    try {
        docker compose version | Out-Null
        Write-Ok "Docker Compose plugin detected"
    }
    catch {
        Write-Err "Docker Compose plugin is missing"
        exit 1
    }
}

function Ensure-Dotnet10 {
    $hasDotnet10 = $false
    if (Get-Command dotnet -ErrorAction SilentlyContinue) {
        $sdks = dotnet --list-sdks
        if ($sdks -match "^10\\.") {
            $hasDotnet10 = $true
        }
    }

    if ($hasDotnet10) {
        Write-Ok ".NET 10 SDK already installed"
        return
    }

    Write-Info "Installing .NET 10 SDK via official script"
    $scriptPath = Join-Path $env:TEMP "dotnet-install.ps1"
    Invoke-WebRequest -Uri "https://dot.net/v1/dotnet-install.ps1" -OutFile $scriptPath
    & powershell -ExecutionPolicy Bypass -File $scriptPath -Channel "10.0"

    $dotnetPath = Join-Path $env:USERPROFILE ".dotnet"
    if (Test-Path $dotnetPath) {
        $env:PATH = "$dotnetPath;$dotnetPath\tools;$env:PATH"
    }
    Write-Ok ".NET SDK installation finished"
}

function Ensure-EnvFile {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Ok "Created .env from .env.example"
    }
    else {
        Write-Ok ".env already exists"
    }
}

function Ensure-TlsCerts {
    if (-not (Test-Path "certs")) {
        New-Item -ItemType Directory -Path "certs" | Out-Null
    }

    if ((Test-Path "certs/novadrive-local.crt") -and (Test-Path "certs/novadrive-local.key")) {
        Write-Ok "TLS certificates already exist"
        return
    }

    if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
        Write-Warn "OpenSSL not found. Install OpenSSL to auto-generate TLS certs."
        return
    }

    Write-Info "Generating self-signed TLS certificate"
    openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes `
        -keyout certs/novadrive-local.key `
        -out certs/novadrive-local.crt `
        -subj "/C=EU/ST=Local/L=Local/O=NovaDrive/CN=localhost"
    Write-Ok "TLS certificates generated in ./certs"
}

function Wait-Url($Url, $Name, $TimeoutSeconds = 120) {
    Write-Info "Waiting for $Name at $Url"
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                Write-Ok "$Name is healthy"
                return
            }
        }
        catch {
        }
        Start-Sleep -Seconds 1
    }

    Write-Err "$Name did not become healthy in time"
    exit 1
}

function Open-Browser($Url) {
    try {
        Start-Process $Url | Out-Null
    }
    catch {
        Write-Warn "Open this URL manually: $Url"
    }
}

function Run-MigrationsAndSeed {
    Write-Info "Running SQL migrations"
    try {
        dotnet ef database update --project .\final\final.csproj --startup-project .\final\final.csproj
    }
    catch {
        Write-Warn "dotnet-ef missing. Installing tool and retrying"
        dotnet tool install --global dotnet-ef --version 10.*
        $env:PATH = "$env:USERPROFILE\.dotnet\tools;$env:PATH"
        dotnet ef database update --project .\final\final.csproj --startup-project .\final\final.csproj
    }

    Write-Info "Running MongoDB seed/index setup"
    docker compose exec -T mongo mongosh "mongodb://novadrive:supersecret@mongo:27017/admin" --eval "db = db.getSiblingDB('novadrive_telemetry'); db.createCollection('telemetrySnapshots'); db.createCollection('sensorDiagnostics');"
    Write-Ok "Database setup complete"
}

Write-Info "Detected OS: Windows"
Ensure-DockerInstalled
Start-DockerDesktop
Ensure-Compose
Ensure-Dotnet10

Write-Info "Restoring NuGet packages"
dotnet restore .\final\final.csproj
dotnet restore .\final.Tests\final.Tests.csproj
dotnet restore .\final.IntegrationTests\final.IntegrationTests.csproj
Write-Ok "NuGet restore complete"

Ensure-EnvFile
Ensure-TlsCerts

Write-Info "Pulling Docker images"
docker compose pull

Write-Info "Building and starting containers"
docker compose up --build -d

Wait-Url "http://localhost:5000/health" "API health"
Wait-Url "http://localhost:5173" "Website"
Wait-Url "http://localhost:8025" "Mailpit"
Wait-Url "http://localhost:80" "Seq"

Run-MigrationsAndSeed

Write-Info "Starting telemetry simulator"
docker compose up -d simulator

Write-Host ""
Write-Ok "Nova Drive stack is ready"
Write-Host "API:      http://localhost:5000"
Write-Host "Website:  http://localhost:5173"
Write-Host "gRPC:     http://localhost:5001"
Write-Host "Health:   http://localhost:5000/health"
Write-Host "Mailpit:  http://localhost:8025"
Write-Host "Seq:      http://localhost:80"
Write-Host "Admin:    admin@novadrive.local / Admin123!"
Write-Host "Curl:     curl -s http://localhost:5000/health"
Open-Browser "http://localhost:5173"