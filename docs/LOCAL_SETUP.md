Local setup — quick start

Prerequisites
- Docker Desktop (for docker-compose) OR .NET 10 SDK + Node/Bun for frontend dev
- (Windows) PowerShell recommended

Run full stack with Docker Compose
1. Build & run:
   - docker compose up --build
2. Open frontend: http://localhost:5173
3. API: http://localhost:5048 (examples: /api/public/price, /api/public/register)

Run without Docker (development)
1. Start backend only:
   - dotnet run --project final
   - Backend listens on port 5048 by default
2. Start frontend (development mode):
   - cd "website tests" && bun run dev    # or npm run dev

Dev helper (Windows PowerShell)
- .\dev.ps1  — starts backend (docker if available) and frontend in new windows

Common issues & troubleshooting
- Build error: "file is being used by another process" when running dotnet build
  - Cause: running instance of the app (apphost) is locking files.
  - Fix: stop running instance (close window or run `Stop-Process -Name final -Force`), or use `.
    dev.ps1` which stops any lingering process before launching.

- Ports already in use
  - Default ports: frontend 5173, backend 5048, Postgres 5432, Mongo 27017
  - Use `netstat -ano | Select-String ':5048|:5173|:5432|:27017'` to inspect

- Docker Compose doesn't start
  - Ensure Docker Desktop is running and you have sufficient resources.
  - Run `docker compose logs` to inspect service logs.

Seed/demo accounts
- admin@novadrive.local / Admin123!
- passenger@novadrive.local / Password123!

CI / tests
- Unit tests: dotnet test ./final.Tests
- Integration tests (use Docker): dotnet test ./final.IntegrationTests

If something still fails, paste the error output and I will help diagnose it.