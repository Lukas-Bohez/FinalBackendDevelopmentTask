#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERROR]${NC} $1"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

detect_os() {
  local uname_out
  uname_out="$(uname -s)"
  case "$uname_out" in
    Linux*)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        OS_TYPE="WSL"
      else
        OS_TYPE="Linux"
      fi
      ;;
    Darwin*)
      OS_TYPE="macOS"
      ;;
    *)
      OS_TYPE="Unknown"
      ;;
  esac
  log_ok "Detected OS: $OS_TYPE"
}

install_docker_if_missing() {
  if command -v docker >/dev/null 2>&1; then
    log_ok "Docker is already installed"
    return
  fi

  if [ "$OS_TYPE" = "Linux" ] || [ "$OS_TYPE" = "WSL" ]; then
    log_info "Installing Docker via official convenience script"
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    sudo systemctl enable --now docker
    log_ok "Docker installed"
    return
  fi

  if [ "$OS_TYPE" = "macOS" ]; then
    log_warn "Docker Desktop is required on macOS. Install it from https://www.docker.com/products/docker-desktop/"
    log_warn "After installation, start Docker Desktop and rerun ./bootstrap.sh"
    exit 0
  fi

  log_err "Unsupported OS for automatic Docker setup"
  exit 1
}

start_docker_daemon() {
  if docker info >/dev/null 2>&1; then
    log_ok "Docker daemon already running"
    return
  fi

  if [ "$OS_TYPE" = "Linux" ] || [ "$OS_TYPE" = "WSL" ]; then
    log_info "Starting Docker daemon"
    sudo systemctl start docker || true
  elif [ "$OS_TYPE" = "macOS" ]; then
    log_info "Starting Docker Desktop"
    open -a Docker || true
  fi
}

wait_for_docker() {
  log_info "Waiting for Docker daemon"
  local spinner='|/-\\'
  local i=0
  local max=60
  while ! docker info >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -gt "$max" ]; then
      echo
      log_err "Docker did not become ready within 60 seconds"
      exit 1
    fi
    printf "\r${BLUE}[%c] Waiting for Docker... (%ds/%ds)${NC}" "${spinner:i%4:1}" "$i" "$max"
    sleep 1
  done
  echo
  log_ok "Docker is ready"
}

install_compose_plugin_if_missing() {
  if docker compose version >/dev/null 2>&1; then
    log_ok "Docker Compose plugin detected"
    return
  fi

  if [ "$OS_TYPE" = "Linux" ] || [ "$OS_TYPE" = "WSL" ]; then
    log_info "Installing Docker Compose plugin"
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
  else
    log_warn "Please ensure Docker Compose plugin is available in Docker Desktop"
  fi
}

install_dotnet_if_missing() {
  if command -v dotnet >/dev/null 2>&1 && dotnet --list-sdks | grep -q '^10\.'; then
    log_ok ".NET 10 SDK already installed"
    return
  fi

  log_info "Installing .NET 10 SDK with dotnet-install.sh"
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  chmod +x /tmp/dotnet-install.sh
  /tmp/dotnet-install.sh --channel 10.0 --install-dir "$HOME/.dotnet"
  export PATH="$HOME/.dotnet:$PATH"
  log_ok ".NET SDK installation finished"
}

restore_packages() {
  log_info "Restoring NuGet packages"
  dotnet restore ./final/final.csproj
  dotnet restore ./final.Tests/final.Tests.csproj
  dotnet restore ./final.IntegrationTests/final.IntegrationTests.csproj
  log_ok "NuGet restore complete"
}

ensure_env_file() {
  if [ ! -f .env ]; then
    cp .env.example .env
    log_ok "Created .env from .env.example"
  else
    log_ok ".env already exists"
  fi
}

generate_tls_certs() {
  mkdir -p certs
  if [ -f certs/novadrive-local.crt ] && [ -f certs/novadrive-local.key ]; then
    log_ok "TLS certificates already exist"
    return
  fi

  log_info "Generating self-signed TLS certificate"
  openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
    -keyout certs/novadrive-local.key \
    -out certs/novadrive-local.crt \
    -subj "/C=EU/ST=Local/L=Local/O=NovaDrive/CN=localhost"
  log_ok "TLS certificates generated in ./certs"
}

wait_http() {
  local url="$1"
  local name="$2"
  local max_seconds="$3"
  local i=0

  log_info "Waiting for $name at $url"
  while ! curl -fsS "$url" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge "$max_seconds" ]; then
      log_err "$name did not become healthy in ${max_seconds}s"
      exit 1
    fi
    sleep 1
  done
  log_ok "$name is healthy"
}

run_migrations_and_seed() {
  log_info "Running SQL migrations"
  if ! dotnet ef database update --project ./final/final.csproj --startup-project ./final/final.csproj; then
    log_warn "dotnet ef failed. Installing dotnet-ef and retrying"
    dotnet tool install --global dotnet-ef --version 10.* || true
    export PATH="$HOME/.dotnet/tools:$PATH"
    dotnet ef database update --project ./final/final.csproj --startup-project ./final/final.csproj
  fi
  log_ok "SQL migration step done"

  log_info "Ensuring MongoDB seed/index script executes"
  docker compose exec -T mongo mongosh \
    "mongodb://${MONGO_USER:-novadrive}:${MONGO_PASSWORD:-supersecret}@mongo:27017/admin" \
    --eval "db = db.getSiblingDB('${MONGO_DB:-novadrive_telemetry}'); db.createCollection('telemetrySnapshots'); db.createCollection('sensorDiagnostics');"
  log_ok "Mongo seed step done"
}

start_stack() {
  log_info "Pulling images"
  docker compose pull

  log_info "Building and starting containers"
  docker compose up --build -d
}

wait_for_services() {
  wait_http "http://localhost:5000/health" "API health" 120
  wait_http "http://localhost:5173" "Website" 120
  wait_http "http://localhost:8025" "Mailpit" 120
  wait_http "http://localhost:80" "Seq" 120
}

open_browser() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  else
    log_warn "Open this URL manually: $url"
  fi
}

start_simulator() {
  log_info "Starting telemetry simulator container"
  docker compose up -d simulator
  log_ok "Simulator is running"
}

print_summary() {
  echo
  log_ok "Nova Drive stack is ready"
  echo "- API: http://localhost:5000"
  echo "- Website: http://localhost:5173"
  echo "- gRPC: http://localhost:5001"
  echo "- Health: http://localhost:5000/health"
  echo "- Mailpit: http://localhost:8025"
  echo "- Seq: http://localhost:80"
  echo "- PostgreSQL: localhost:5432"
  echo "- MongoDB: localhost:27017"
  echo "- Admin email: admin@novadrive.local"
  echo "- Admin password: Admin123!"
  echo "- Curl example: curl -s http://localhost:5000/health"
  open_browser "http://localhost:5173"
}

main() {
  detect_os
  install_docker_if_missing
  start_docker_daemon
  wait_for_docker
  install_compose_plugin_if_missing
  install_dotnet_if_missing
  restore_packages
  ensure_env_file
  generate_tls_certs
  start_stack
  wait_for_services
  run_migrations_and_seed
  start_simulator
  print_summary
}

main