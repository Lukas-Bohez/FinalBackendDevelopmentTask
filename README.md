# Nova Drive — backend (Minimal API)

Quick start (development):

1. Docker (recommended):
   - docker-compose up --build
   - App available at http://localhost:5000 (Swagger at /swagger)

2. Without Docker (dev):
   - Update `appsettings.json` connection strings if needed
   - dotnet restore
   - dotnet run --project final

What I implemented (MVP + Docker + telemetry + PDF):

- Users (registration + JWT login, BCrypt hashed passwords)
- Vehicles (basic model + nearest-vehicle lookup)
- Rides (request, basic fare snapshot)
- Pricing engine (full business rules: multipliers, night surcharge, loyalty discount cap, promo codes, VAT, min fare, rounding)
- Telemetry stored in MongoDB (HTTP ingestion + gRPC scaffold available)
- Sensor diagnostics stored in MongoDB (Lidar/Radar/Camera + severity/error code/raw JSON)
- PDF invoice generation (QuestPDF) — saved to /invoices and emailed when SMTP is configured
- FluentValidation, Serilog, Swagger
- PostgreSQL (relational) + MongoDB (telemetry) via Docker Compose
- Observability: Prometheus metrics (`/metrics`) + health endpoint (`/health`)
- Unit tests for the Pricing engine (xUnit)
- Integration tests for auth/ride/telemetry workflows (WebApplicationFactory + isolated SQLite test DB)
- API smoke tests ready in `final/requests.http`
- Vehicle simulator script ready in `scripts/simulate_vehicles.ps1`

Next recommended steps:
- Add migrations + production DB hardening
- Add GraphQL/gRPC client examples and UI

Files added/modified:
- `Program.cs` — Minimal API endpoints, DI, auth
- `Models/`, `DTOs/`, `Services/`, `Repositories/`, `Validators/`
- `Dockerfile`, `docker-compose.yml`, `requests.http`
- `final.Tests/` — unit tests for pricing engine

Run unit tests locally:
- dotnet test ./final.Tests

Run integration tests (no Docker required by default):
- dotnet test ./final.IntegrationTests

Run full stack with Docker Compose:
- docker compose up --build
- UI: http://localhost:5173 (proxied to API)

Generate sample telemetry + sensor diagnostics:
- .\scripts\simulate_vehicles.ps1 -BaseUrl "http://localhost:5000" -Iterations 20 -DelaySeconds 2

More local-run tips and troubleshooting: see `docs/LOCAL_SETUP.md`.

CI: A GitHub Actions workflow (`.github/workflows/ci.yml`) runs unit + integration tests on push/PR.

Repository publishing:
- This workspace has been prepared for exam submission and includes a CI workflow. To publish the repository to the exam GitHub URL `https://github.com/howest-mct/exam-project-backend-Lukas-Bohez` you must either grant push access or run the push from your machine (see instructions below).

To push from your machine:
```powershell
git remote add exam https://github.com/howest-mct/exam-project-backend-Lukas-Bohez.git
git push https://<PERSONAL_ACCESS_TOKEN>@github.com/howest-mct/exam-project-backend-Lukas-Bohez.git HEAD:main --set-upstream
```

Or add me as a collaborator / provide a deploy key and I'll push and create the submission tag.

EF Migrations (already added):
- Migrations are in `final/Migrations` (InitialCreate)
- To apply migrations locally against Postgres: `dotnet ef database update --project final --startup-project final`

Possible future improvements:
- Add Testcontainers-backed Postgres/Mongo integration test profile
- Wire email sending and attach generated PDFs to messages
- Expand UI with additional user/admin workflows