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
- PDF invoice generation (QuestPDF) — saved to /invoices
- FluentValidation, Serilog, Swagger
- PostgreSQL (relational) + MongoDB (telemetry) via Docker Compose
- Unit tests for the Pricing engine (xUnit)

Next recommended steps:
- Add integration tests (Testcontainers)
- Add migrations + production DB hardening
- Add email sending for invoices (SMTP)
- Add GraphQL/gRPC client examples and UI

Files added/modified:
- `Program.cs` — Minimal API endpoints, DI, auth
- `Models/`, `DTOs/`, `Services/`, `Repositories/`, `Validators/`
- `Dockerfile`, `docker-compose.yml`, `requests.http`
- `final.Tests/` — unit tests for pricing engine

Run unit tests locally:
- dotnet test ./final.Tests

Run integration tests (uses Testcontainers — Docker required):
- dotnet test ./final.IntegrationTests

Run full stack with Docker Compose:
- docker compose up --build
- UI: http://localhost:5173 (proxied to API)

More local-run tips and troubleshooting: see `docs/LOCAL_SETUP.md`.

CI: A GitHub Actions workflow (`.github/workflows/ci.yml`) runs unit + integration tests on push/PR.

EF Migrations (already added):
- Migrations are in `final/Migrations` (InitialCreate)
- To apply migrations locally against Postgres: `dotnet ef database update --project final --startup-project final`

If you'd like, I can:
- Add Testcontainers-based CI job (GitHub Actions)
- Wire up email sending and attach generated PDFs to messages
- Improve the UI styles and add more user flows

Tell me which next step you want me to implement first.