# NovaDrive — Study Guide

## Architecture
- Minimal API (.NET 10) with DI, repository & service layers.
- Primary DB: PostgreSQL; tests use SQLite; telemetry stored in MongoDB.
- Auth: JWT (HMAC-SHA256), BCrypt password hashing.

## Important files
- App entry: `Program.cs` — routes, DI, startup (migrations/seeding).
- Pricing logic: `Services/PricingService.cs` — base fare, multipliers, discounts, VAT, min fare.
- Auth: `Services/AuthService.cs` — hash/verify + JWT generation.
- Telemetry: `Services/TelemetryService.cs` — MongoDB collection `telemetry`.

## Key Endpoints
- `POST /api/auth/register` — create user, returns JWT
- `POST /api/auth/login` — authenticate, returns JWT
- `POST /api/pricing/estimate` — price breakdown
- `POST /api/rides` — request ride
- `POST /api/rides/{id}/complete` — complete ride, create payment, generate invoice PDF
- `POST /api/telemetry` — ingest telemetry
- `GET /study` — study guide (this file)

## Pricing summary (how to explain)
1. Base fare = starting rate + (per km * distance) + (per min * duration)
2. Apply vehicle multiplier (Van x1.5, Luxury x2.2)
3. Night surcharge: +15% of base (between 22:00–06:00)
4. Loyalty discount: €1 per 100 points, capped at 20% of fare
5. Promo code: flat or percentage (validated from DB)
6. VAT applied (default 21%), final amount rounded, minimum fare €5

## Telemetry
- Uses `MongoClient` with `Mongo:ConnectionString` and `Mongo:Database` config.
- Collection: `telemetry` with timestamped entries per vehicle.

## Running locally (quick)
```powershell
# build
dotnet build ./final/final.csproj
# run with SQLite (safe local run)
$env:Database__Provider='sqlite'; dotnet run --project ./final/final.csproj
```
- Swagger UI: `http://localhost:5000/swagger` (or `https://localhost:5001/swagger`).

## Tests
```powershell
dotnet test ./final.Tests/final.Tests.csproj
dotnet test ./final.IntegrationTests/final.IntegrationTests.csproj
```

## Likely exam questions (short answers)
- Q: Why separate telemetry to MongoDB? — Flexible schema, high write throughput, easy time-series queries.
- Q: How are discounts applied safely? — Fetch code, check active/expiry/min amount, apply flat/% accordingly.
- Q: How do you ensure tests are deterministic? — Integration tests use SQLite in-memory or file DB and seeded data.

## Study tips
- Read `Program.cs` to understand routing and DI wiring.
- Trace a full scenario: register → request ride → complete ride → invoice.
- Review `PricingService.cs` math with sample numbers (write a quick script to calc examples).

---
Good luck — ask me to generate flashcards or a printable cheat-sheet next.
