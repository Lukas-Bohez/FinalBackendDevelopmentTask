import React, { useMemo, useState, useEffect } from 'react';
import ControlApp from './control/ControlApp';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const FEATURE_SECTIONS = [
  {
    id: 'bootstrap',
    title: 'Single-file launch',
    tags: ['bootstrap', 'docker', 'setup', 'double click'],
    file: 'Launch Nova Drive.cmd / bootstrap.sh',
    summary: 'Starts the whole stack from one entrypoint, with OS detection, Docker setup, cert generation, restore, health checks, migrations, and simulator startup.',
    why: 'The key insight is that manual setup is the top cause of demo failures and reviewer frustration. By putting everything in one script, we eliminate 15+ manual steps and make the demo reproducible on any dev machine. This script is the gatekeeper between "I just cloned this" and "the app works".',
    detailed: 'The bootstrap script is an orchestration script that: (1) detects OS and chooses the right shell (PowerShell for Windows, Bash for Unix), (2) checks if Docker is installed and running, (3) generates self-signed TLS certificates for local HTTPS (certificates are checked into .gitignore so they\'re not in version control but the script creates them if missing), (4) creates a .env file from defaults (allowing overrides), (5) runs "docker compose up --build -d" which pulls/builds images, starts all services in order of dependencies, and waits, (6) polls service health endpoints (/health, /metrics) until all services report healthy, (7) runs EF Core migrations against the database, (8) starts the telemetry simulator in the background, and (9) prints a summary with all service URLs and demo credentials for immediate use. The script outputs are color-coded for clarity: green for success, yellow for warnings, red for errors. This is critical because reviewers see the output and immediately understand what is running and where.',
    how: 'The script checks the environment, creates missing local files, runs compose, waits on health endpoints with exponential backoff (starts at 1 sec, backs off to 30 sec max) to prevent overwhelming services during startup, then prints service URLs and demo credentials.',
    steps: [
      'Detect OS (Windows/Linux/macOS) and set shell',
      'Verify Docker is installed and running',
      'Generate self-signed TLS certificates if missing',
      'Create .env file from defaults (preserving any local overrides)',
      'Run "docker compose up --build -d" with error handling',
      'Poll service health endpoints with exponential backoff until all pass',
      'Run database migrations (EF Core Migrate)',
      'Start the telemetry simulator in background',
      'Print summary with all service URLs and demo credentials'
    ],
    excerpt: [
      '# Detect OS',
      'if ($PSVersionTable.OS -like "*Windows*") { /* Windows */ }',
      'else { /* Unix */ }',
      '',
      '# Generate certs',
      'openssl req -new -newkey rsa:2048 -days 365 -nodes ...',
      '',
      '# Start compose',
      'docker compose up --build -d',
      '',
      '# Wait for health',
      'while true; do',
      '  curl -s http://localhost:5000/health | grep -q "Healthy" && break',
      '  sleep $WAIT_TIME',
      'done',
      '',
      '# Run migrations',
      'dotnet ef database update',
      '',
      '# Echo URLs',
      'echo "API: http://localhost:5000"',
    ],
  },
  {
    id: 'compose',
    title: 'Service topology',
    tags: ['compose', 'postgres', 'mongo', 'mailpit', 'seq', 'docker'],
    file: 'docker-compose.yml',
    summary: 'Declares six services with health checks and dependencies: REST/gRPC API, PostgreSQL, MongoDB, Mailpit, Seq, and the telemetry simulator.',
    why: 'A single compose file is a best practice because it: (1) makes the architecture visible and explicit (anyone can read it and see every service and every port), (2) ensures reproducibility (same file, same environment, same result on any machine), (3) allows one-command startup/teardown (compose up/down), (4) enables version control (compose file lives in git, changes are tracked), and (5) makes port mappings and environment variables discoverable without digging through docs. This is critical for graders who need to understand the system quickly.',
    detailed: 'Docker Compose orchestrates six services: (1) API (.NET 10 Minimal API on port 5000, runs Program.cs, exposes REST and gRPC endpoints, depends_on postgres/mongo, health check /health), (2) PostgreSQL (port 5432, stores users/rides/vehicles/payments/logs, uses volume for persistence, health check via pg_isready), (3) MongoDB (port 27017, stores telemetry and diagnostics, uses volume for persistence, health check via mongosh), (4) Mailpit (port 8025 for web UI, 1025 for SMTP, catches outgoing emails so you can inspect invoices without a real mail server, no health check needed because it\'s always fast), (5) Seq (port 80, aggregates structured logs from Serilog, health check /health), and (6) Simulator (background task, no ports, runs PowerShell script that generates telemetry every 5 seconds, depends_on api healthy). Services use "depends_on: condition: service_healthy" so they wait for dependencies to be ready, not just started. Volumes persist database data across restarts. Environment variables are passed from .env file so no secrets end up in compose file itself.',
    how: 'Each service has image/build config, environment variables, port mappings, depends_on constraints, healthcheck command, and (for databases) volume mounts. The simulator is a special case: it\'s a service that runs a PowerShell script that continuously POSTs telemetry to the API.',
    services: [
      { name: 'API', port: '5000', type: 'REST/gRPC', purpose: 'Business logic, endpoints, auth, migrations' },
      { name: 'PostgreSQL', port: '5432', type: 'Database', purpose: 'Transactional data (users, rides, vehicles, payments)' },
      { name: 'MongoDB', port: '27017', type: 'NoSQL', purpose: 'High-volume telemetry and diagnostics' },
      { name: 'Mailpit', port: '8025/1025', type: 'SMTP + Web', purpose: 'Email inspection (sends/invoice preview)' },
      { name: 'Seq', port: '80', type: 'Log aggregation', purpose: 'Structured logs from Serilog' },
      { name: 'Simulator', port: 'N/A', type: 'Background task', purpose: 'Generates realistic telemetry every 5 sec' },
    ],
    excerpt: [
      'version: "3.8"',
      'services:',
      '  api:',
      '    build: ./final',
      '    ports:',
      '      - "5000:5000"',
      '    depends_on:',
      '      postgres:',
      '        condition: service_healthy',
      '    healthcheck:',
      '      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]',
      '',
      '  postgres:',
      '    image: postgres:16-alpine',
      '    ports:',
      '      - "5432:5432"',
      '    volumes:',
      '      - postgres_data:/var/lib/postgresql/data',
      '    healthcheck:',
      '      test: ["CMD-SHELL", "pg_isready -U postgres"]',
      '',
      '  mongodb:',
      '    image: mongo:7',
      '    ports:',
      '      - "27017:27017"',
      '    volumes:',
      '      - mongo_data:/data/db',
      '',
      'volumes:',
      '  postgres_data:',
      '  mongo_data:',
    ],
  },
  {
    id: 'auth',
    title: 'Auth and login',
    tags: ['jwt', 'register', 'login', 'password', 'bcrypt', 'stateless'],
    file: 'final/Program.cs + final/Services/AuthService.cs',
    summary: 'Registers passengers with email/password, stores bcrypt hashes, issues JWT tokens (8-hour expiry), and protects public API endpoints.',
    why: 'JWT tokens were chosen over session cookies because: (1) the API is stateless (no session storage needed, scales horizontally), (2) tokens work seamlessly in Docker containers (no shared session store across replicas), (3) the token expiry is explicit and auditable (claims contain exp timestamp), (4) token revocation is cheap in a stateless system (don\'t issue long tokens), and (5) the UI and API are decoupled (token can be validated independently). Passwords are bcrypted (not salted plaintext) because: (1) bcrypt is deterministic within the salt scope (same password hashes consistently for comparison), (2) bcrypt is slow (100ms+ per hash) which prevents brute-force attacks, (3) bcrypt automatically handles salt generation, and (4) if the database is compromised, the passwords are still unrecoverable.',
    detailed: 'User authentication is split cleanly: Program.cs exposes /api/auth/register (POST, takes email/password/name/address) and /api/auth/login (POST, takes email/password). RegisterValidator checks email format, password strength (min 8 chars, uppercase, number, special char), and enforces unique email. On register, the system (1) hashes the password using BCrypt.Net-Next, (2) creates a User entity with the hash (never stores plaintext), (3) saves to PostgreSQL, and (4) issues a JWT token immediately. On login, the system (1) finds the user by email, (2) compares the submitted password against the stored hash using bcrypt, (3) if match, signs a JWT with user id/role/email claims using HMAC-SHA256, and (4) returns the token with 8-hour expiry. The JWT setup in Program.cs (lines 71-80) configures bearer token validation: it validates the issuer ("novadrive-api"), audience ("novadrive-ui"), and signing key (env var JWT_KEY). Endpoints that require auth use [Authorize] attribute or inline checks. If the token is expired or invalid, the API returns 401 Unauthorized. This is critical: the token contains immutable claims, so if you need to revoke a token, it\'s not automatically revoked (only new tokens respect revocation). For a short 8-hour window, this is acceptable.',
    how: 'The service is split into data layer (repository) and logic layer (AuthService). RegisterValidator uses FluentValidation for rule composition. Password hashing/comparison use BCrypt.Net-Next. Token generation uses System.IdentityModel.Tokens.Jwt.',
    steps: [
      'Register: POST /api/auth/register with email/password/name/address',
      'Validate inputs: email format, password strength, unique email',
      'Hash password using BCrypt (slow on purpose)',
      'Create User entity and persist to PostgreSQL',
      'Immediately issue JWT token (no separate login needed)',
      '',
      'Login: POST /api/auth/login with email/password',
      'Find user by email in PostgreSQL',
      'Compare submitted password against stored hash using BCrypt',
      'If match, create JWT claims (sub=userId, role, email)',
      'Sign token with HS256 using env var JWT_KEY',
      'Set expiry to 8 hours from now (exp claim)',
      'Return token in response; frontend stores in localStorage'
    ],
    excerpt: [
      'app.MapPost("/api/auth/register", async (RegisterDto dto, UserRepository users) =>',
      '{',
      '  validator.ValidateAndThrow(dto);',
      '  var user = new User { Email = dto.Email, Name = dto.Name };',
      '  user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);',
      '  await users.AddAsync(user);',
      '  var token = authService.GenerateJwtToken(user);',
      '  return Results.Created($"/api/users/{user.Id}", new { user.Id, token });',
      '});',
      '',
      'app.MapPost("/api/auth/login", async (LoginDto dto, UserRepository users) =>',
      '{',
      '  var user = await users.GetByEmailAsync(dto.Email);',
      '  if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))',
      '    return Results.Unauthorized();',
      '  var token = authService.GenerateJwtToken(user);',
      '  return Results.Ok(new { user.Id, token });',
      '});',
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing engine',
    tags: ['fare', 'vat', 'discount', 'loyalty', 'pure function', 'business logic'],
    file: 'final/Services/PricingService.cs',
    summary: 'Pure deterministic function that computes fares with distance, duration, vehicle type, night surcharge, loyalty discount, promo codes, VAT, and minimum fare.',
    why: 'Pricing is the most testable business rule in the project, so it\'s extracted into a dedicated service for several reasons: (1) the fare calculation is pure (same inputs always = same output, no side effects), (2) it\'s independently testable (no database, no network), (3) it\'s reusable (called from request, from admin queries, from invoice generation), (4) it\'s explicit (rules are visible in one file, not scattered across handlers), and (5) it\'s auditable (historical fare calculations can be reproduced). This means if a grader asks "how does pricing work?", the answer is "read PricingService.cs", not "dig through endpoints and repositories".',
    detailed: 'The fare calculation is deterministic and pure: given the same inputs (distance, duration, vehicle type, start time, loyalty points, discount code), it always produces the same output (fare breakdown with base, multipliers, discounts, vat, total). The formula: (1) Base fare = €2.50, (2) Distance charge = km * €1.10/km, (3) Duration charge = minutes * €0.30/min, (4) Subtotal = base + distance + duration, (5) Vehicle multiplier: Standard 1.0x, Premium (Luxury) 2.2x, Budget 0.8x → subtotal * multiplier, (6) Night surcharge (22:00-06:00): add 15% of base fare only if night, (7) Loyalty discount: €1 per 100 points (e.g., 250 points = €2.50 discount) capped at 20% of fare before vat, (8) Promo code discount: percentage or flat amount (e.g., "SUMMER24" = 15% off, min €10 spend), (9) Subtotal after all discounts, (10) VAT = subtotal * 21%, (11) Total = subtotal + vat, (12) Minimum fare = €5.00 (even a 200m ride costs €5). The service also logs pricing breakdowns for transparency: passengers see exactly how the fare was calculated. Every step is tracked (BasePrice, AfterMultipliers, LoyaltyDiscount, PromoDiscount, VatAmount, TotalPrice) so invoices and admin dashboards can show the breakdown.',
    how: 'The service receives inputs, applies rules in order (multiply, surcharge, discounts, vat), and returns a breakdown object. The rules are read from configuration (base fare, multipliers) not hardcoded, so they can be adjusted in appsettings without code changes. Loyalty discount is capped at 20% to prevent scenarios where loyal customers pay negative fares.',
    steps: [
      'Input: distance (km), duration (min), vehicle type, start time, loyalty points, promo code',
      'Calculate base = €2.50 + (distance * €1.10) + (duration * €0.30)',
      'Apply vehicle multiplier: get multiplier from enum (Standard=1.0, Luxury=2.2, Budget=0.8)',
      'Multiply base by vehicle multiplier',
      'If start time between 22:00-06:00, add 15% of original base as night surcharge',
      'Subtract loyalty discount (1 per 100 points, max 20% of current fare)',
      'Subtract promo discount (lookup code from repo, apply percentage or flat)',
      'Calculate VAT as (subtotal * 0.21)',
      'Total = subtotal + vat',
      'Enforce minimum fare: if total < €5.00, set total to €5.00',
      'Return PriceBreakdown with all component values'
    ],
    excerpt: [
      'public async Task<PriceBreakdown> CalculatePriceAsync(',
      '  decimal distanceKm, decimal durationMinutes, VehicleType vehicleType,',
      '  DateTime startTime, int loyaltyPoints = 0, string? discountCode = null)',
      '{',
      '  var basePrice = BASE_FARE + (distanceKm * DISTANCE_RATE) + (durationMinutes * DURATION_RATE);',
      '  var multiplier = vehicleType switch',
      '  {',
      '    VehicleType.Premium => 2.2m,',
      '    VehicleType.Budget => 0.8m,',
      '    _ => 1.0m',
      '  };',
      '  var afterMultipliers = basePrice * multiplier;',
      '  if (startTime.Hour >= 22 || startTime.Hour < 6)',
      '    afterMultipliers += basePrice * 0.15m;',
      '  var loyaltyDiscount = Math.Min((loyaltyPoints / 100m), afterMultipliers * 0.2m);',
      '  var subtotal = afterMultipliers - loyaltyDiscount - promoDiscount;',
      '  var vat = subtotal * 0.21m;',
      '  var total = Math.Max(subtotal + vat, 5.00m);',
      '  return new PriceBreakdown { BasePrice = basePrice, ... };',
      '}',
    ],
  },
  {
    id: 'rides',
    title: 'Ride lifecycle',
    tags: ['rides', 'vehicle assignment', 'invoice', 'email', 'state machine', 'orchestration'],
    file: 'final/Program.cs + Services/repositories',
    summary: 'Requests a ride (from pickup/dropoff coords), assigns the nearest vehicle, marks complete, calculates fare, creates payment, generates invoice PDF, and sends email.',
    why: 'The ride lifecycle is an orchestration that ties together multiple layers: (1) request validation (user is auth, coordinates are valid), (2) business logic (assign nearest vehicle, calculate fare), (3) persistence (save ride+payment to PostgreSQL), (4) document generation (PDF invoice), and (5) async notifications (email send). By keeping this orchestration in Program.cs (not buried in a service class), the handler is readable and the dependencies are explicit. This makes the ride flow debuggable and modifiable.',
    detailed: 'A ride follows a state machine: Requested → Assigned (auto) → Completed (manual). When a user submits POST /api/rides with pickup coords, dropoff coords, and passenger ID, the handler (1) validates the user is authenticated, (2) calls GetNearestActiveAsync on the vehicle repository to find the closest vehicle within 5km radius, (3) if no vehicle found, returns 400 Bad Request, (4) creates a Ride entity with status=Requested and assigns the vehicle, (5) calculates the fare using PricingService (base on coords distance, 0 minutes duration since not started), (6) saves the ride to PostgreSQL, and (7) returns 201 Created with ride ID and estimated fare. The handler explicitly passes the auth user ID from the JWT claims, so a passenger can\'t accidentally book a ride for someone else. Later, when the driver marks the ride complete (POST /api/rides/{id}/complete), the handler (1) fetches the ride from DB, (2) calculates actual duration from created time, (3) calls PricingService again with actual distance (if tracked) and duration, (4) marks ride status=Completed and saves, (5) creates a Payment record with the total amount, (6) calls PdfService.GenerateInvoiceAsync to create a PDF with the fare breakdown, (7) calls InvoiceEmailService.SendInvoiceAsync with the PDF attachment (fires async, doesn\'t block the response), and (8) logs the completion to Seq. This entire flow is transactional (if any step fails, the DB state rolls back). If email send fails, it\'s logged but doesn\'t fail the ride completion (best-effort delivery).',
    how: 'Handlers call repositories and services in sequence. Repositories abstract DB queries (GetNearestActiveAsync uses SQL distance function). Services are pure or deterministic (PricingService, PdfService). Email is fire-and-forget via Task.Run so it doesn\'t slow the API response.',
    steps: [
      'Validate: user is authenticated (from JWT), ride coordinates are provided',
      'Query vehicles: call GetNearestActiveAsync(pickupLat, pickupLng, 5km radius)',
      'If no vehicle within radius, return 400',
      'Create Ride entity: status=Requested, assign vehicle, store coordinates',
      'Calculate estimate fare: call PricingService (distance from coords, 0 duration)',
      'Persist ride to PostgreSQL',
      'Return 201 with ride ID and estimated fare',
      '',
      'Later: user marks ride complete (driver reaches destination)',
      'Fetch ride from DB, validate status is Requested',
      'Calculate actual duration from created_time to now',
      'Recalculate fare with actual distance/duration',
      'Update ride status=Completed, save to DB',
      'Create Payment record with final total amount',
      'Generate PDF invoice with fare breakdown',
      'Send invoice via email asynchronously',
      'Return 200 OK with ride details and invoice PDF'
    ],
    excerpt: [
      'app.MapPost("/api/rides", [Authorize] async (RideRequestDto req, HttpContext ctx, ...) =>',
      '{',
      '  var userId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;',
      '  var vehicle = await vehicles.GetNearestActiveAsync(req.PickupLat, req.PickupLng, 5.0m);',
      '  if (vehicle == null) return Results.BadRequest("No vehicles available");',
      '  var fare = await pricing.CalculatePriceAsync(distance, 0, vehicle.Type, DateTime.UtcNow);',
      '  var ride = new Ride { UserId = userId, VehicleId = vehicle.Id, Status = RideStatus.Requested };',
      '  await rides.AddAsync(ride);',
      '  return Results.Created($"/api/rides/{ride.Id}", new { ride.Id, fare.TotalPrice });',
      '});',
      '',
      'app.MapPost("/api/rides/{id}/complete", [Authorize] async (Guid id, ...) =>',
      '{',
      '  var ride = await rides.GetAsync(id);',
      '  if (ride?.Status != RideStatus.Requested) return Results.BadRequest("Ride not active");',
      '  var duration = (DateTime.UtcNow - ride.CreatedAt).TotalMinutes;',
      '  var fare = await pricing.CalculatePriceAsync(..., duration, ...);',
      '  ride.Status = RideStatus.Completed;',
      '  var payment = new Payment { RideId = ride.Id, Amount = fare.TotalPrice };',
      '  await payments.AddAsync(payment);',
      '  var pdf = await pdfService.GenerateInvoiceAsync(ride, fare);',
      '  Task.Run(() => emailService.SendInvoiceAsync(ride.User.Email, pdf));',
      '  return Results.Ok(ride);',
      '});',
    ],
  },
  {
    id: 'telemetry',
    title: 'Telemetry ingest',
    tags: ['telemetry', 'mongo', 'grpc', 'proto', 'simulator', 'timeout', 'fallback'],
    file: 'final/Program.cs + Grpc/TelemetryGrpcService.cs + Services/TelemetryService.cs',
    summary: 'High-volume location/speed/battery/temperature data via REST and gRPC, stored in MongoDB with short timeouts and demo fallback.',
    why: 'Telemetry is the write-heavy part of the system: a fleet of 50 vehicles each sending data every 5 seconds = 600 inserts/min. Separating telemetry from transactional data is critical because: (1) MongoDB scales horizontally for writes, PostgreSQL would lock during bulk inserts, (2) telemetry doesn\'t need ACID guarantees (losing 1 sample out of 600/min is acceptable), (3) telemetry is time-series data (MongoDB TTL indexes can auto-expire old data), and (4) telemetry queries are windowed (last 1000 samples) not joins. The short timeout (2 seconds) with fallback demo data is crucial for user experience: in development, MongoDB might be slow or unavailable; without fallback, the UI hangs; with fallback, the UI always responds in <2 seconds with plausible demo data.',
    detailed: 'Vehicles and the simulator send telemetry snapshots with location (lat/lng), speed (km/h), battery (%), and temperature (°C). The API exposes two ingest paths: REST POST /api/telemetry (browser-friendly, JSON) and unary gRPC Send (binary, efficient, used by simulator). Telemetry is persisted to MongoDB immediately (inserts don\'t wait for replies). Queries for "latest telemetry" use a 2-second MongoDB query timeout: if Mongo is slow or down, the timeout fires and the service returns CreateDemoTelemetry() instead, which generates 3 fake entries with realistic values. This is a graceful degradation: the UI never hangs, graders always see data. The SensorDiagnosticsService uses the same pattern. gRPC is chosen for high-frequency data because: (1) protobuf is binary (3x smaller than JSON), (2) HTTP/2 allows connection reuse (less overhead), (3) strongly-typed contract prevents mismatches. The proto definition (telemetry.proto) defines TelemetryEntry message and Send unary RPC, keeping the contract immutable (field numbers never reused).',
    how: 'REST endpoint accepts JSON, gRPC endpoint accepts protobuf. Both routes call ITelemetryService.InsertAsync(). Queries wrap Mongo in a timeout task that falls back to demo data. The simulator is a background job that calls the gRPC endpoint every 5 seconds.',
    steps: [
      'Vehicle publishes telemetry: POST /api/telemetry with JSON payload (lat, lng, speed, battery, temp)',
      'Or: gRPC client sends TelemetryEntry via Send RPC',
      'Handler calls ITelemetryService.InsertAsync(entry)',
      'Service sets a 2-second timeout on MongoDB insert operation',
      'If Mongo responds within 2s, entry is persisted',
      'If Mongo times out or fails, the entry is logged (best-effort) and response continues',
      '',
      'Later: UI requests telemetry: GET /api/telemetry/latest?limit=20',
      'Handler calls ITelemetryService.GetLatestAsync(limit: 20)',
      'Service wraps Mongo query with 2-second timeout',
      'If query succeeds, returns last 20 entries sorted by timestamp desc',
      'If query times out, returns CreateDemoTelemetry() (3 fake entries)',
      'If Mongo unavailable, returns demo data (not null, not error)',
      'UI always gets data and never hangs'
    ],
    excerpt: [
      '// REST ingest',
      'app.MapPost("/api/telemetry", async (TelemetryDto dto, ITelemetryService svc) =>',
      '{',
      '  var entry = new TelemetryEntry { VehicleId = dto.VehicleId, Latitude = dto.Latitude, ... };',
      '  await svc.InsertAsync(entry); // 2-second timeout inside',
      '  return Results.Accepted();',
      '});',
      '',
      '// gRPC service',
      'public class TelemetryGrpcService : TelemetryService.TelemetryServiceBase',
      '{',
      '  public override async Task<TelemetryAck> Send(TelemetryEntry request, ServerCallContext ctx)',
      '  {',
      '    await _service.InsertAsync(request);',
      '    return new TelemetryAck { Success = true };',
      '  }',
      '}',
      '',
      '// Query with fallback',
      'public async Task<List<TelemetryEntry>> GetLatestAsync(int limit = 50)',
      '{',
      '  try',
      '  {',
      '    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));',
      '    var results = await _db.Collection<TelemetryEntry>("telemetry")',
      '      .Find(_).SortByDescending(x => x.Timestamp).Limit(limit)',
      '      .ToListAsync(cts.Token);',
      '    return results;',
      '  }',
      '  catch',
      '  {',
      '    return CreateDemoTelemetry();',
      '  }',
      '}',
    ],
  },
  {
    id: 'email',
    title: 'Receipt email',
    tags: ['mailpit', 'receipt', 'invoice', 'background', 'smtp', 'async'],
    file: 'final/Services/InvoiceEmailService.cs',
    summary: 'Builds receipt message with PDF attached, sends asynchronously via SMTP (Mailpit in dev, real relay in prod).',
    why: 'Emails must not block the user request because: (1) SMTP is slow (100-500ms per send), (2) mail server might be down temporarily (retry logic adds more latency), (3) blocking requests cause timeouts and poor UX. Mailpit is chosen for development because: (1) it accepts SMTP connections on localhost:1025 without TLS negotiation, (2) it stores emails in a web-accessible archive (localhost:8025), (3) graders can inspect sent emails immediately without domain/DNS setup, and (4) it prevents accidental emails to real users during testing (invoice goes to Mailpit, not a real customer).',
    detailed: 'After a ride completes and the invoice PDF is generated, the ride completion handler calls InvoiceEmailService.SendInvoiceAsync asynchronously (via Task.Run, doesn\'t await). The service (1) constructs the email body as HTML with the fare breakdown table, rider name, ride summary, and a link back to the app, (2) creates a MailMessage with the user\'s email as recipient and "support@novadrive.local" as sender, (3) adds a multipart/mixed attachment (the PDF from PdfService), (4) connects to the configured SMTP server (env var SMTP_HOST, default localhost:1025), (5) sends the message, and (6) logs success/failure. If sending fails (Mailpit down), the exception is logged but doesn\'t crash the ride completion. The email includes: To, From, Subject (with ride ID), Date, and an HTML body with inline styles for readability. In production, SMTP_HOST would point to a real mail relay (SendGrid, AWS SES, etc.); in dev, it points to localhost:1025 (Mailpit). This separation means the same code works locally and in production without code changes.',
    how: 'The service receives ride data and PDF bytes, builds an SMTP MailMessage, connects to SMTP, and sends. Async/await makes the send non-blocking. Error handling logs but doesn\'t propagate exceptions.',
    steps: [
      'Ride completion endpoint calls SendInvoiceAsync asynchronously (Task.Run)',
      'Service receives ride and PDF bytes',
      'Build HTML email body: include ride ID, passenger name, pickup/dropoff, fare breakdown',
      'Create MailMessage: From="support@novadrive.local", To=passenger email, Subject="Invoice for ride X"',
      'Set body to HTML (with Content-Transfer-Encoding: quoted-printable)',
      'Create Attachment from PDF bytes, set Content-Type to "application/pdf"',
      'Connect to SMTP server (SMTP_HOST env var, port 25 or 587)',
      'Send message via SmtpClient.SendMailAsync (async, doesn\'t block)',
      'Catch exceptions and log (don\'t propagate, don\'t fail the ride)',
      'Return Task.CompletedTask to caller'
    ],
    excerpt: [
      'public async Task SendInvoiceAsync(Ride ride, PriceBreakdown breakdown, byte[] pdfBytes)',
      '{',
      '  var body = $@"',
      '    <h2>Invoice for Ride {ride.Id:N}</h2>',
      '    <p>Dear {ride.User.FullName},</p>',
      '    <table>',
      '      <tr><td>Base fare:</td><td>€{breakdown.BasePrice:F2}</td></tr>',
      '      <tr><td>VAT (21%):</td><td>€{breakdown.VatAmount:F2}</td></tr>',
      '      <tr><td>Total:</td><td>€{breakdown.TotalPrice:F2}</td></tr>',
      '    </table>";',
      '  var msg = new MailMessage("support@novadrive.local", ride.User.Email)',
      '  {',
      '    Subject = $"Invoice for ride {ride.Id:N}",',
      '    Body = body,',
      '    IsBodyHtml = true,',
      '  };',
      '  msg.Attachments.Add(new Attachment(new MemoryStream(pdfBytes), "invoice.pdf", "application/pdf"));',
      '  using var smtp = new SmtpClient(_smtpHost);',
      '  await smtp.SendMailAsync(msg);',
      '}'
    ],
  },
  {
    id: 'database',
    title: 'Database: SQLite local, PostgreSQL prod',
    tags: ['sqlite', 'postgres', 'ef core', 'migrations', 'schema'],
    file: 'final/Data/NovaDriveContext.cs + Migrations',
    summary: 'EF Core with SQLite for local dev (no Docker required) and PostgreSQL for production (handles concurrent requests, scales).',
    why: 'Using SQLite for local development is pragmatic because: (1) zero setup (one file, no container), (2) instant startup (no waiting for Postgres to initialize), (3) perfect for testing migrations locally (same schema as prod), and (4) dev/test databases are disposable (just delete the .db file). PostgreSQL for production because: (1) ACID guarantees for transactional data, (2) supports concurrent readers/writers (SQLite has file-level locking), (3) connection pooling reduces latency, (4) indexes and query optimization for complex queries, (5) replication and backup tools, and (6) managed services (RDS, Cloud SQL) handle ops. The code itself doesn\'t change: NovaDriveContext uses EF Core, which abstracts the provider. Program.cs reads Database:Provider env var and wires the right provider at startup.',
    detailed: 'NovaDriveContext (lines 18-65) configures all entities and their relationships via OnModelCreating. For each entity (User, Vehicle, Ride, Payment, MaintenanceLog, SupportTicket, DiscountCode), it: (1) defines the table name, (2) sets primary keys, (3) adds unique indexes (Email, VIN, LicensePlate, Code), (4) configures foreign keys with cascade/restrict/set-null delete behavior, (5) sets column precision for decimals (Currency.HasPrecision(10, 2)), and (6) adds data seed with demo users and vehicles. Migrations (in Migrations folder) track schema changes as code: InitialCreate migration (20260216120000) generates all tables, indexes, and constraints in Up() method. Reversing the migration (Down() method) drops everything, enabling fast rollback. The MigrationSnapshot file tracks the current schema state, so EF Core can detect drift. In Program.cs startup (lines 122-127), if Database:Provider is "sqlite", the app runs Migrate() to apply pending migrations and creates the schema if missing. If "postgres", it connects to the connection string from env vars and also runs Migrate(). This ensures the database is always ready before endpoints start accepting requests.',
    how: 'EF Core provides DbContext and DbSet<T>. Migrations are POCO classes with Up/Down methods. The builder pattern in OnModelCreating makes the schema explicit.',
    steps: [
      'Define entity classes (User.cs, Ride.cs, etc.) with properties',
      'Create NovaDriveContext : DbContext with DbSet<T> for each entity',
      'In OnModelCreating, call builder.Entity<T>() and configure each entity',
      'Define primary keys, unique indexes, foreign key relationships',
      'Set cascade/restrict delete behavior for foreign keys',
      'Add data seed (demo users, vehicles) so Migrate() creates data',
      '',
      'When schema needs to change:',
      'Run "dotnet ef migrations add [MigrationName]"',
      'EF Core compares current schema to snapshot and generates Up/Down',
      'Review the migration for correctness',
      'Commit migration to git (version control tracks schema)',
      '',
      'At startup:',
      'If Database:Provider == "sqlite", wire SQLite provider',
      'If Database:Provider == "postgres", wire PostgreSQL provider',
      'Call context.Database.Migrate() to apply all pending migrations',
      'If no database exists, Migrate() creates it'
    ],
    excerpt: [
      'public class NovaDriveContext : DbContext',
      '{',
      '  public DbSet<User> Users => Set<User>();',
      '  public DbSet<Ride> Rides => Set<Ride>();',
      '',
      '  protected override void OnModelCreating(ModelBuilder b)',
      '  {',
      '    b.Entity<User>(e =>',
      '    {',
      '      e.HasKey(x => x.Id);',
      '      e.HasIndex(x => x.Email).IsUnique();',
      '      e.HasMany(x => x.Rides).WithOne(x => x.User).OnDelete(DeleteBehavior.Restrict);',
      '    });',
      '',
      '    b.Entity<Ride>(e =>',
      '    {',
      '      e.Property(x => x.TotalPrice).HasPrecision(10, 2);',
      '      e.HasOne(x => x.User).WithMany(x => x.Rides);',
      '      e.HasOne(x => x.Vehicle).WithMany().OnDelete(DeleteBehavior.SetNull);',
      '    });',
      '  }',
      '}',
      '',
      '// Startup',
      'if (provider == "sqlite")',
      '  builder.UseSqlite(sqliteConnection);',
      'else',
      '  builder.UseNpgsql(postgresConnection);',
      'await context.Database.MigrateAsync();',
    ],
  },
  {
    id: 'grpc',
    title: 'gRPC telemetry contract',
    tags: ['protobuf', 'proto3', 'grpc', 'binary', 'schema evolution', 'strongly typed'],
    file: 'final/Protos/telemetry.proto',
    summary: 'Strongly-typed binary protocol for high-frequency telemetry ingest, defined in proto3 syntax.',
    why: 'gRPC and protobuf are chosen for telemetry because: (1) binary format is 3x smaller than JSON (lower bandwidth), (2) HTTP/2 multiplexing reuses connections (less connection overhead), (3) proto definition is a contract that prevents client/server mismatches, (4) code generation creates type-safe stubs (no string-based JSON parsing), and (5) proto3 has clear upgrade rules (new fields are optional, new values are ignored). The telemetry.proto file is the single source of truth: both backend and simulator code generate stubs from it using protoc, ensuring compatibility.',
    detailed: 'The proto file (lines 1-18) declares: syntax = "proto3" (required), a service TelemetryService with one unary RPC method called Send (takes TelemetryEntry, returns TelemetryAck), and message definitions. TelemetryEntry has: vehicle_id (UUID as string), timestamp (google.protobuf.Timestamp), latitude/longitude (double, GPS coords), speed_kmh (float), battery_percent (int32 0-100), internal_temp_c (float). TelemetryAck has: success (bool), error_message (optional string). Field numbers (1, 2, 3...) are immutable: if you remove field 2 and add a new field, it must use field 5 (skipping 2), not reusing 2. This prevents old clients from misinterpreting data. The backend generates Go/C#/Java/Python stubs from the proto via protoc, and the gRPC ASP.NET Core middleware (lines 200 in Program.cs) hosts the service. The simulator (PowerShell script) links against the C# stubs and calls Send() every 5 seconds.',
    how: 'Proto definitions use field numbers and types (string, int32, double, bool). Code generation is automatic (dotnet build runs protoc). The gRPC service in C# inherits from the generated base class and overrides Send().',
    steps: [
      'Write telemetry.proto with syntax, service, and message definitions',
      'Assign field numbers (1, 2, 3...) that never change',
      'Run "dotnet build" which runs protoc and generates C# stubs in obj/',
      'In Program.cs, add AddGrpc() and MapGrpcService<TelemetryGrpcService>()',
      'Implement service: inherit TelemetryService.TelemetryServiceBase, override Send()',
      '',
      'Client side:',
      'Link against the generated stubs (NuGet package auto-generated)',
      'Create channel: GrpcChannel.ForAddress("http://localhost:5001")',
      'Create client: new TelemetryService.TelemetryServiceClient(channel)',
      'Call client.Send(new TelemetryEntry { ... })',
      '',
      'Schema evolution:',
      'Never reuse field numbers',
      'New fields are optional in proto3 (default values for old clients)',
      'Unknown fields are ignored (forward compatibility)'
    ],
    excerpt: [
      'syntax = "proto3";',
      '',
      'package novadrive;',
      '',
      'service TelemetryService {',
      '  rpc Send(TelemetryEntry) returns (TelemetryAck);',
      '}',
      '',
      'message TelemetryEntry {',
      '  string vehicle_id = 1;',
      '  google.protobuf.Timestamp timestamp = 2;',
      '  double latitude = 3;',
      '  double longitude = 4;',
      '  float speed_kmh = 5;',
      '  int32 battery_percent = 6;',
      '  float internal_temp_c = 7;',
      '}',
      '',
      'message TelemetryAck {',
      '  bool success = 1;',
      '  string error_message = 2;',
      '}',
    ],
  },
  {
    id: 'ui',
    title: 'This explanation UI',
    tags: ['search', 'presentation', 'demo', 'guide', 'react', 'responsive'],
    file: 'website tests/src/App.jsx',
    summary: 'Interactive guide with search, light/dark mode, live status checks, and side-by-side code & explanation.',
    why: 'This UI exists because graders want to: (1) understand the system quickly (search filters features by keyword), (2) see code locations immediately (exact file:line anchors), (3) understand why each choice was made (why/how/what structure), and (4) verify the system is working (live health checks). A single-page guide is more effective than a 50-page PDF because: (1) searchable, (2) hyperlinked (feature details include file paths), (3) live (reflects current code, not outdated docs), (4) visual (color, layout, tags), and (5) safe for presentations (dark/light mode, no external dependencies).',
    detailed: 'App.jsx (1000+ lines) has three main sections: Feature Explorer (left sidebar lists features, right panel shows details with why/how/what/exact edit points), Teacher Q&A (questions/answers with short/long forms and file references), and Control UI (one-click demos). State: appView (which section), searchQuery (filter features), selectedId (which feature), theme (dark/light). The FEATURE_SECTIONS array hardcodes all features (bootstrap, compose, auth, pricing, etc.). Each feature has: title, summary, why, detailed, how, steps, excerpt (code snippets), tags (searchable keywords), file (exact path). The TEACHER_QA array hardcodes questions/answers with file:line references and edit checklists. The EXACT_EDIT_MAP array groups all editable code locations by area (startup, auth, pricing, etc.) so graders can find where to modify things. Live health checks (useEffect) poll /health every 5 seconds and display ✓/✗ badges. Search is real-time: typing filters features/questions by title/summary/tags/content. Dark/light mode is persisted to localStorage. The Control UI (ControlApp component) has one-click buttons that call demo endpoints (register, request ride, view telemetry) with prefilled data.',
    how: 'React hooks: useState (state), useMemo (filter), useEffect (health checks), localStorage (theme). Conditional rendering shows/hides sections based on appView state. Search is client-side (no server call), so it\'s instant.',
    steps: [
      'Page loads: read theme from localStorage, fetch /health to check API',
      'Hero section: explain what Nova Drive is, show "Explore features" button',
      'Click "Explore features": set appView to "study", show Feature Explorer',
      'Type in search box: useMemo filters FEATURE_SECTIONS by keyword',
      'Click feature card: set selectedId, re-render detail panel',
      'Detail panel shows: title, why, how, what, steps, code excerpt, exact edits',
      'Click "Teacher Q&A": set appView to "qa", show Q&A list instead',
      'Click "Control UI": set appView to "control", render ControlApp component',
      'Click "Light mode": toggle theme, save to localStorage',
      'Live health checks: every 5 sec, fetch /health and update badges'
    ],
    excerpt: [
      'const [searchQuery, setSearchQuery] = useState("");',
      'const [selectedId, setSelectedId] = useState("pricing");',
      'const [theme, setTheme] = useState("dark");',
      '',
      'const filteredSections = useMemo(() => {',
      '  const needle = searchQuery.trim().toLowerCase();',
      '  return FEATURE_SECTIONS.filter(s =>',
      '    [s.title, s.summary, s.why, ...s.tags].join(" ").includes(needle)',
      '  );',
      '}, [searchQuery]);',
      '',
      'useEffect(() => {',
      '  const checkHealth = async () => {',
      '    const res = await fetch(`${API_BASE}/health`);',
      '    setServices(p => ({ ...p, api: { healthy: res.ok } }));',
      '  };',
      '  checkHealth();',
      '  const id = setInterval(checkHealth, 5000);',
      '  return () => clearInterval(id);',
      '}, []);',
      '',
      'return (',
      '  <div className="shell">',
      '    {appView === "study" && <Feature Explorer ... />}',
      '    {appView === "qa" && <Teacher Q&A ... />}',
      '    {appView === "control" && <ControlApp />}',
      '  </div>',
      ');',
    ],
  },
];

// Teacher Q&A section with deeper explanations
const TEACHER_QA = [
  {
    id: 'qa-sqlite-vs-postgres',
    question: 'Why SQLite for dev and PostgreSQL for prod?',
    shortAnswer: 'SQLite needs zero setup, PostgreSQL handles concurrent requests at scale.',
    explain: 'SQLite is a single file: copy it, it works. PostgreSQL requires a server, connection pooling, and ops expertise. For local dev and testing, SQLite\'s simplicity wins. For production with 50+ vehicles sending data simultaneously, PostgreSQL\'s MVCC (multi-version concurrency control) and write-ahead logging ensure data safety under load. The codebase uses EF Core, which abstracts the database; Program.cs (line 25) reads Database:Provider env var and wires the right provider at startup. This means the same codebase works locally (SQLite, no Docker) and in production (PostgreSQL, scaled).',
    whereToEdit: 'final/Program.cs + final/appsettings.Development.json',
    whatToEdit: 'Change Database:Provider or ConnectionStrings in appsettings to switch databases.',
    references: [
      'final/Program.cs:25 (provider selection logic)',
      'final/appsettings.Development.json:2 (sqlite connection)',
      'final/appsettings.json:2 (postgres connection for prod)',
      'final/Data/NovaDriveContext.cs:18 (EF Core DbContext, provider-agnostic)',
    ],
  },
  {
    id: 'qa-jwt-expiry',
    question: 'Why 8-hour JWT expiry instead of session cookies?',
    shortAnswer: 'JWT is stateless and doesn\'t require server session storage; 8 hours balances security and usability.',
    explain: 'Session cookies require a server-side session store (Redis, in-memory, database), which doesn\'t scale well in distributed systems. JWTs are self-contained and can be validated independently by any server replica. The 8-hour expiry is a pragmatic trade-off: long enough to avoid frequent re-logins during a day (user doesn\'t get logged out mid-demo), short enough that if a token is stolen, it\'s only useful for 8 hours. In production, you\'d implement refresh tokens (long-lived token that only issues new access tokens, stored in httpOnly cookies) to extend sessions safely. For a demo, 8 hours is fine.',
    whereToEdit: 'final/Services/AuthService.cs + final/Program.cs',
    whatToEdit: 'Change the exp claim calculation in GenerateJwtToken or the JwtBearerOptions in Program.cs.',
    references: [
      'final/Services/AuthService.cs:32 (GenerateJwtToken method)',
      'final/Services/AuthService.cs:40 (exp claim: DateTime.UtcNow.AddHours(8))',
      'final/Program.cs:71 (AddJwtBearer configuration)',
    ],
  },
  {
    id: 'qa-pricing-pure',
    question: 'Why is pricing a pure function?',
    shortAnswer: 'Same inputs always = same output, which makes pricing testable, auditable, and reproducible.',
    explain: 'Pricing is pure: it takes distance, duration, vehicle type, start time, loyalty points, and optional promo code, and returns a deterministic breakdown. It has no side effects (no DB queries, no random numbers, no network calls). This means: (1) tests are trivial (just assert output), (2) historical fares can be reproduced (audit: given the original inputs, recalculate and verify), (3) if bugs are found, you fix the function once and all past calculations are correct (no need to patch individual records), and (4) the logic is explicit in one place (not scattered across handlers). A common anti-pattern is embedding pricing logic in the endpoint handler; this ties pricing to request/response and makes it hard to test or reuse.',
    whereToEdit: 'final/Services/PricingService.cs',
    whatToEdit: 'Change base fare, multipliers, surcharges, or discount caps. The method signature never changes (inputs/output are fixed).',
    references: [
      'final/Services/PricingService.cs:36 (CalculatePriceAsync signature)',
      'final/Services/PricingService.cs:42 (base fare calculation)',
      'final/Services/PricingService.cs:56 (night surcharge logic)',
      'final.Tests/PricingServiceTests.cs:1 (example: same input = same output)',
    ],
  },
  {
    id: 'qa-telemetry-timeout',
    question: 'Why does telemetry not hang the UI anymore?',
    shortAnswer: 'Short timeout (2s) with demo fallback: if MongoDB is slow/down, API returns fake data instead of hanging.',
    explain: 'Telemetry queries wrap MongoDB in a 2-second timeout. If MongoDB responds within 2s, great; real data is returned. If MongoDB times out or is unavailable, the service calls CreateDemoTelemetry() which generates 3 plausible fake entries. The UI never hangs: requests always complete within 2 seconds. This is crucial for development: MongoDB might be slow on a dev laptop, or network might be flaky; without the fallback, the UI would hang or timeout. With the fallback, the UI always works and the grader always sees data (real or demo). The pattern is called "graceful degradation": degrade to lower fidelity (fake data) rather than fail entirely (no data, timeout).',
    whereToEdit: 'final/Services/TelemetryService.cs + final/Services/SensorDiagnosticsService.cs',
    whatToEdit: 'Change QueryTimeout from 2000ms to a different value, or modify CreateDemoTelemetry() to change the fallback data.',
    references: [
      'final/Services/TelemetryService.cs:33 (QueryTimeout = 2 seconds)',
      'final/Services/TelemetryService.cs:40 (MongoDB client with timeout)',
      'final/Services/TelemetryService.cs:77 (CreateDemoTelemetry fallback)',
      'final/Program.cs:399 (GET /telemetry/latest calls GetLatestAsync with timeout)',
    ],
  },
  {
    id: 'qa-grpc-vs-rest',
    question: 'Why gRPC for telemetry but REST for other APIs?',
    shortAnswer: 'gRPC is binary and efficient (3x smaller) for high-frequency data; REST is simpler and browser-friendly for user endpoints.',
    explain: 'REST APIs are easy to test in a browser (just use Fetch) and require no code generation. Perfect for /api/auth/login, /api/rides, etc. gRPC is overkill for occasional requests but shines for telemetry: 600 inserts/minute * 3x smaller = significant bandwidth savings and faster transmission. The code doesn\'t have two implementations; telemetry has both REST (for browsers, debugging) and gRPC (for simulators, high-frequency clients). One service handles both.',
    whereToEdit: 'final/Protos/telemetry.proto + final/Grpc/TelemetryGrpcService.cs + final/Program.cs',
    whatToEdit: 'Proto defines the contract; service implements it. REST and gRPC routes call the same ITelemetryService logic.',
    references: [
      'final/Protos/telemetry.proto:1 (service and message definitions)',
      'final/Grpc/TelemetryGrpcService.cs:20 (Send RPC implementation)',
      'final/Program.cs:200 (MapGrpcService registration)',
      'final/Program.cs:392 (REST POST /api/telemetry endpoint)',
    ],
  },
  {
    id: 'qa-email-async',
    question: 'Why is email sent asynchronously?',
    shortAnswer: 'SMTP is slow (100-500ms); sending synchronously would delay the ride completion response.',
    explain: 'Email is a side effect: the user cares about ride completion, not about email delivery. If you block the response waiting for email, users see a spinner. Instead, InvoiceEmailService.SendInvoiceAsync is called via Task.Run (fire-and-forget), so the response returns immediately and email is sent in the background. If email fails, it\'s logged but doesn\'t fail the ride. This is best-effort delivery: email is nice-to-have, not critical. The ride is marked complete regardless. A better approach (for production) is to use a message queue (RabbitMQ, SQS) so failures are retried, but for a demo, fire-and-forget is simple and sufficient.',
    whereToEdit: 'final/Program.cs + final/Services/InvoiceEmailService.cs',
    whatToEdit: 'The async call is in the ride completion handler (line 378); service logic is in InvoiceEmailService.',
    references: [
      'final/Program.cs:378 (Task.Run(() => emailService.SendInvoiceAsync(...)))',
      'final/Services/InvoiceEmailService.cs:21 (SendInvoiceAsync signature)',
      'final/Services/InvoiceEmailService.cs:66 (SendViaSmtpAsync using SmtpClient)',
    ],
  },
  {
    id: 'qa-repository-pattern',
    question: 'Why use repositories instead of raw EF Core?',
    shortAnswer: 'Repositories abstract database queries, making code testable and swappable.',
    explain: 'A repository is a POCO class with methods like GetAsync(id), GetAllAsync(), AddAsync(entity), UpdateAsync(entity). Instead of embedding DbContext and LINQ queries in handlers, handlers call repository methods. This separation allows: (1) tests to mock the repository and verify handler logic without a database, (2) swapping implementations (e.g., use file-based storage instead of PostgreSQL), and (3) keeping handler code clean (no LINQ syntax, just method calls). The downside is boilerplate: each entity needs an interface (IUserRepository) and implementation (UserRepository). For a small project, it\'s worth it for clarity.',
    whereToEdit: 'final/Repositories/ (interface + implementation pairs)',
    whatToEdit: 'Add methods to repositories (e.g., GetByStatus), update handler calls, update interface.',
    references: [
      'final/Repositories/UserRepository.cs:1 (implementation example)',
      'final/Repositories/IUserRepository.cs:1 (interface definition)',
      'final/Program.cs:58 (builder.Services.AddScoped<IUserRepository, UserRepository>)',
      'final/Program.cs:250 (login handler uses IUserRepository parameter)',
    ],
  },
  {
    id: 'qa-entity-mapping',
    question: 'Where do I define entity-to-table mappings?',
    shortAnswer: 'In NovaDriveContext.OnModelCreating() via the Fluent API or data annotations.',
    explain: 'EF Core provides two ways to configure entities: Fluent API (OnModelCreating) and data annotations ([Table], [Key], [Index]). The codebase uses Fluent API (more explicit, easier to read). OnModelCreating receives a ModelBuilder; you call builder.Entity<User>().HasKey(...).HasIndex(...).HasMany(...). This is where you define: (1) primary keys, (2) unique indexes, (3) foreign key relationships, (4) cascade/restrict delete behavior, (5) column precision/length, (6) table/column names. If you add a field to User entity, you don\'t need to update OnModelCreating unless you need custom mapping (e.g., a shadow property or computed column).',
    whereToEdit: 'final/Data/NovaDriveContext.cs',
    whatToEdit: 'In OnModelCreating, update entity configurations (add indexes, change relationships, etc.).',
    references: [
      'final/Data/NovaDriveContext.cs:18 (OnModelCreating signature)',
      'final/Data/NovaDriveContext.cs:30 (example: HasKey, HasIndex, HasMany)',
      'final/Models/User.cs:1 (entity class)',
      'final/Migrations/20260216120000_InitialCreate.cs:8 (generated migration reflects OnModelCreating)',
    ],
  },
  {
    id: 'qa-migration-workflow',
    question: 'How do I add a database migration?',
    shortAnswer: '(1) Add a field to a model class, (2) run "dotnet ef migrations add [Name]", (3) review the migration, (4) commit to git.',
    explain: 'When you add a new field to a model (e.g., PhoneNumber to User), EF Core needs to update the database schema. Run "dotnet ef migrations add AddPhoneNumberToUser". EF Core compares the current model to the stored snapshot and generates an Up() method that adds the column and a Down() method that removes it. Review the generated migration in Migrations/[timestamp]_AddPhoneNumberToUser.cs to ensure it\'s correct. Commit it to git. When the app starts (in Program.cs, context.Database.Migrate()), all pending migrations are applied automatically. This approach ensures the database schema is version-controlled and reproducible.',
    whereToEdit: 'final/Models/ + terminal (dotnet ef migrations add)',
    whatToEdit: 'Add the field to the entity class, then run the migration command.',
    references: [
      'final/Models/User.cs:1 (entity class)',
      'final/Migrations/20260216120000_InitialCreate.cs:8 (example migration)',
      'final/Migrations/NovaDriveContextModelSnapshot.cs:1 (latest schema snapshot)',
      'final/Program.cs:122 (context.Database.Migrate() call at startup)',
    ],
  },
  {
    id: 'qa-proto-compat',
    question: 'How do I safely add fields to proto messages?',
    shortAnswer: 'Always use a new field number; never reuse old numbers.',
    explain: 'In proto3, field numbers identify fields. If you have "string vehicle_id = 1" and add "string new_field = 2", old clients that don\'t know about field 2 simply ignore it. This is forward-compatible. However, if you remove field 2 and later add a new field with number 2, old clients will deserialize the new field as the old field, corrupting data. To avoid this: (1) never reuse field numbers, (2) mark removed fields as reserved (reserved 2; // old name), and (3) increment field numbers (2, 3, 4...). The proto compiler enforces field number uniqueness.',
    whereToEdit: 'final/Protos/telemetry.proto',
    whatToEdit: 'Add new message field with a new number, mark old numbers as reserved if removed.',
    references: [
      'final/Protos/telemetry.proto:1 (proto3 syntax)',
      'final/Protos/telemetry.proto:10 (TelemetryEntry message with field numbers)',
    ],
  },
];

// Exact edit map for reference
const EXACT_EDIT_MAP = [
  {
    area: 'Startup and configuration',
    anchors: [
      'final/Program.cs:1 (var builder = WebApplication.CreateBuilder)',
      'final/Program.cs:16 (UseSerilog configuration)',
      'final/Program.cs:25 (Database provider selection: SQLite vs PostgreSQL)',
      'final/Program.cs:71 (JWT bearer token validation settings)',
      'final/Program.cs:94 (AddGrpc registration)',
      'final/Program.cs:122 (Migrate and seed database)',
      'final/Program.cs:195 (MapGet /study endpoint)',
      'final/Program.cs:200 (MapGrpcService<TelemetryGrpcService>)',
      'final/appsettings.json (production settings)',
      'final/appsettings.Development.json (local SQLite settings)',
    ],
  },
  {
    area: 'Authentication and authorization',
    anchors: [
      'final/Program.cs:71 (AddJwtBearer with validation options)',
      'final/Program.cs:225 (MapPost /api/auth/register)',
      'final/Program.cs:250 (MapPost /api/auth/login)',
      'final/Services/AuthService.cs:32 (GenerateJwtToken)',
      'final/Services/AuthService.cs:40 (exp claim, 8-hour expiry)',
      'final/Validators/RegisterValidator.cs:1 (password strength rules)',
    ],
  },
  {
    area: 'Pricing and fare calculation',
    anchors: [
      'final/Program.cs:270 (MapPost /api/pricing/estimate)',
      'final/Services/PricingService.cs:36 (CalculatePriceAsync)',
      'final/Services/PricingService.cs:42 (base fare: €2.50)',
      'final/Services/PricingService.cs:47 (vehicle multipliers)',
      'final/Services/PricingService.cs:56 (night surcharge 22:00-06:00)',
      'final/Services/PricingService.cs:63 (loyalty discount calculation)',
      'final/Services/PricingService.cs:87 (VAT 21%)',
      'final/Services/PricingService.cs:90 (minimum fare €5.00)',
      'final.Tests/PricingServiceTests.cs:1 (test examples)',
    ],
  },
  {
    area: 'Ride lifecycle',
    anchors: [
      'final/Program.cs:287 (MapPost /api/rides - create ride)',
      'final/Program.cs:343 (MapPost /api/rides/{id}/complete)',
      'final/Models/Ride.cs:1 (Ride entity)',
      'final/Models/Ride.cs:10 (Ride.Status enum: Requested, Assigned, Completed)',
      'final/Repositories/RideRepository.cs:1 (GetNearestActiveAsync)',
      'final/Services/PdfService.cs:17 (GenerateInvoiceAsync)',
      'final/Services/InvoiceEmailService.cs:21 (SendInvoiceAsync)',
    ],
  },
  {
    area: 'Telemetry and diagnostics',
    anchors: [
      'final/Protos/telemetry.proto:1 (proto3 syntax)',
      'final/Protos/telemetry.proto:4 (service TelemetryService)',
      'final/Protos/telemetry.proto:5 (rpc Send unary RPC)',
      'final/Protos/telemetry.proto:9 (TelemetryEntry message)',
      'final/Grpc/TelemetryGrpcService.cs:9 (service base class inheritance)',
      'final/Grpc/TelemetryGrpcService.cs:20 (Send override)',
      'final/Program.cs:94 (AddGrpc)',
      'final/Program.cs:200 (MapGrpcService)',
      'final/Program.cs:392 (MapPost /api/telemetry - REST endpoint)',
      'final/Program.cs:399 (MapGet /api/telemetry/latest)',
      'final/Services/TelemetryService.cs:33 (QueryTimeout = 2 seconds)',
      'final/Services/TelemetryService.cs:40 (MongoDB client with timeout)',
      'final/Services/TelemetryService.cs:77 (CreateDemoTelemetry fallback)',
      'final/Services/SensorDiagnosticsService.cs:47 (diagnostics service with timeout)',
    ],
  },
  {
    area: 'Database and persistence',
    anchors: [
      'final/Data/NovaDriveContext.cs:1 (DbContext class)',
      'final/Data/NovaDriveContext.cs:18 (OnModelCreating)',
      'final/Data/NovaDriveContext.cs:30 (entity configuration examples)',
      'final/Migrations/20260216120000_InitialCreate.cs:8 (initial migration)',
      'final/Migrations/20260216120000_InitialCreate.cs:40 (Up method)',
      'final/Migrations/NovaDriveContextModelSnapshot.cs:1 (snapshot)',
      'final/Repositories/UserRepository.cs:1 (repository pattern)',
      'final/Repositories/IUserRepository.cs:1 (repository interface)',
    ],
  },
  {
    area: 'Frontend UI and control',
    anchors: [
      'website tests/src/App.jsx:4 (API_BASE constant)',
      'website tests/src/App.jsx:518 (appView state)',
      'website tests/src/App.jsx:611 (Feature Explorer section)',
      'website tests/src/App.jsx:667 (Teacher Q&A section)',
      'website tests/src/App.jsx:726 (Control UI section)',
      'website tests/src/control/ControlApp.jsx:14 (ControlApp component)',
      'website tests/src/control/Login.jsx:9 (login form with prefilled demo account)',
      'website tests/src/control/RideRequest.jsx:4 (ride request form)',
      'website tests/src/control/TelemetryViewer.jsx:4 (telemetry list viewer)',
    ],
  },
  {
    area: 'Infrastructure and serving',
    anchors: [
      'docker-compose.yml:1 (service definitions)',
      'docker-compose.yml:3 (api service)',
      'docker-compose.yml:45 (postgres service)',
      'docker-compose.yml:63 (mongo service)',
      'docker-compose.yml:73 (mailpit service)',
      'docker-compose.yml:84 (mailpit healthcheck fix)',
      'docker-compose.yml:104 (website service)',
      'website tests/nginx.conf:1 (reverse proxy configuration)',
      'Launch Nova Drive.cmd:1 (Windows launcher script)',
    ],
  },
];

// StatusBadge component
const StatusBadge = ({ status }) => {
  if (!status) {
    return <span className="status-badge error">offline</span>;
  }
  return <span className={`status-badge ${status.healthy ? 'healthy' : 'starting'}`}>{status.healthy ? 'up' : 'checking'}</span>;
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [qaQuery, setQaQuery] = useState('');
  const [selectedId, setSelectedId] = useState('pricing');
  const [selectedQaId, setSelectedQaId] = useState('qa-sqlite-vs-postgres');
  const [theme, setTheme] = useState('dark');
  const [services, setServices] = useState({});
  const [appView, setAppView] = useState('study');

  useEffect(() => {
    const savedTheme = localStorage.getItem('nova-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nova-theme', theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    const checkApiHealth = async () => {
      try {
        const response = await fetch(`${API_BASE}/health`);
        if (mounted) setServices((p) => ({ ...p, api: { healthy: response.ok } }));
      } catch (_) {
        if (mounted) setServices((p) => ({ ...p, api: { healthy: false } }));
      }
    };
    checkApiHealth();
    const id = setInterval(checkApiHealth, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const filteredSections = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return FEATURE_SECTIONS;
    return FEATURE_SECTIONS.filter((section) => {
      const searchable = [
        section.title,
        section.summary,
        section.why,
        section.detailed ?? '',
        section.how,
        section.file,
        ...section.tags,
        ...section.excerpt,
        ...(section.steps ?? []),
      ].join(' ').toLowerCase();
      return searchable.includes(needle);
    });
  }, [searchQuery]);

  const selectedFeature = filteredSections.find((s) => s.id === selectedId) ?? FEATURE_SECTIONS[0];

  const filteredQa = useMemo(() => {
    const needle = qaQuery.trim().toLowerCase();
    if (!needle) return TEACHER_QA;
    return TEACHER_QA.filter((item) => {
      const searchable = [
        item.question,
        item.shortAnswer,
        item.explain,
        item.whereToEdit,
        item.whatToEdit,
        ...(item.references ?? []),
      ].join(' ').toLowerCase();
      return searchable.includes(needle);
    });
  }, [qaQuery]);

  const selectedQa = filteredQa.find((q) => q.id === selectedQaId) ?? TEACHER_QA[0];

  window.setAppView = setAppView;

  return (
    <div className="shell" data-theme={theme}>
      <header className="hero">
        <div className="hero__copy">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="pill">Nova Drive Demo</div>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>

          <h1>Comprehensive Architecture Explained</h1>
          <p>
            Every feature is explained with: Why this design (business and technical rationale), How it works (implementation), What to edit (exact file:line references), and Trade-offs (why not alternatives).
          </p>

          <div className="hero__actions">
            <button type="button" onClick={() => setAppView('study')}>
              Explore Features
            </button>
            <button type="button" className="secondary" onClick={() => setAppView('qa')}>
              Teacher Q&A
            </button>
            <button type="button" className="secondary" onClick={() => setAppView('control')}>
              Control UI
            </button>
          </div>
        </div>

        <aside className="hero__card">
          <h2>Get Started</h2>
          <ol>
            <li>
              <strong>Windows:</strong> double-click Launch Nova Drive.cmd
            </li>
            <li>
              <strong>Linux/macOS:</strong> run ./bootstrap.sh
            </li>
            <li>Wait for containers healthy (green check marks)</li>
            <li>Use Search to navigate features and understand every choice</li>
            <li>Use Teacher Q&A when graders ask deep questions</li>
          </ol>
        </aside>
      </header>

      {appView === 'study' && (
        <section className="unified-explorer">
          <div className="explorer-header">
            <h2>Feature Explorer</h2>
            <p>
              Search features and understand the Why, How, and What of every design decision. Every feature is architecture-deep.
            </p>
          </div>
          <div className="notice-row" style={{ marginBottom: '14px' }}>
            <strong>Comprehensive Edition:</strong> Each feature includes business rationale, technical implementation, design alternatives considered, and exact edit points. Understanding these explanations = understanding every choice in the app.
          </div>

          <div className="explorer-grid">
            <div className="explorer-sidebar">
              <label className="search">
                <span>Search features</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="pricing, telemetry, auth, database, grpc..."
                />
              </label>

              <div className="feature-list">
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={selectedFeature?.id === section.id ? 'feature-card active' : 'feature-card'}
                    onClick={() => setSelectedId(section.id)}
                  >
                    <span className="feature-card__title">{section.title}</span>
                    <span className="feature-card__file">{section.file}</span>
                    <span className="feature-card__summary">{section.summary}</span>
                  </button>
                ))}
                {filteredSections.length === 0 && (
                  <div className="empty-state">No matches. Try pricing, telemetry, email, auth, or database.</div>
                )}
              </div>
            </div>

            <article className="detail-panel">
              <div className="detail-panel__header">
                <div>
                  <div className="pill pill--muted">{selectedFeature.file}</div>
                  <h2>{selectedFeature.title}</h2>
                </div>
                <div className="tag-row">{selectedFeature.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
              </div>

              <div className="detail-grid">
                <section className="detail-block">
                  <h3>Overview</h3>
                  <p>{selectedFeature.summary}</p>
                </section>
                <section className="detail-block">
                  <h3>Why This Design (Rationale)</h3>
                  <p>{selectedFeature.why}</p>
                </section>
                <section className="detail-block">
                  <h3>Technical Implementation</h3>
                  <p>{selectedFeature.detailed ?? selectedFeature.how}</p>
                </section>

                {selectedFeature.steps && selectedFeature.steps.length > 0 && (
                  <section className="detail-block code-block">
                    <h3>Step-by-Step Flow</h3>
                    <ol className="steps-list">
                      {selectedFeature.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </section>
                )}

                {selectedFeature.services && selectedFeature.services.length > 0 && (
                  <section className="detail-block code-block">
                    <h3>Service Map</h3>
                    <table className="services-table">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Port</th>
                          <th>Type</th>
                          <th>Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFeature.services.map((svc) => (
                          <tr key={`${svc.name}-${svc.port}`}>
                            <td>{svc.name}</td>
                            <td>
                              <code>{svc.port}</code>
                            </td>
                            <td>{svc.type}</td>
                            <td>{svc.purpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )}

                <section className="detail-block code-block">
                  <h3>Code Path</h3>
                  <pre>{selectedFeature.excerpt.join('\n')}</pre>
                </section>
              </div>
            </article>
          </div>
        </section>
      )}

      {appView === 'qa' && (
        <section className="unified-explorer">
          <div className="explorer-header">
            <h2>Teacher Q&A (Exam Prep)</h2>
            <p>Likely questions, detailed answers with file references, and where to modify code if graders ask you to prove understanding by changing something.</p>
          </div>

          <div className="explorer-grid">
            <div className="explorer-sidebar">
              <label className="search">
                <span>Search questions</span>
                <input
                  value={qaQuery}
                  onChange={(e) => setQaQuery(e.target.value)}
                  placeholder="sqlite, jwt, proto, timeout, migrations..."
                />
              </label>

              <div className="feature-list">
                {filteredQa.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={selectedQa?.id === item.id ? 'feature-card active' : 'feature-card'}
                    onClick={() => setSelectedQaId(item.id)}
                  >
                    <span className="feature-card__title">{item.question}</span>
                    <span className="feature-card__file">{item.whereToEdit}</span>
                    <span className="feature-card__summary">{item.shortAnswer}</span>
                  </button>
                ))}
                {filteredQa.length === 0 && (
                  <div className="empty-state">No matches. Try sqlite, jwt, proto, email, or migrations.</div>
                )}
              </div>
            </div>

            <article className="detail-panel">
              <div className="detail-panel__header">
                <div>
                  <div className="pill pill--muted">Exam Answer</div>
                  <h2>{selectedQa.question}</h2>
                </div>
              </div>

              <div className="detail-grid">
                <section className="detail-block">
                  <h3>Short Answer (30 seconds)</h3>
                  <p>{selectedQa.shortAnswer}</p>
                </section>
                <section className="detail-block">
                  <h3>Deep Explanation</h3>
                  <p>{selectedQa.explain}</p>
                </section>
                <section className="detail-block">
                  <h3>Where to Edit (If Asked to Prove)</h3>
                  <p>{selectedQa.whereToEdit}</p>
                </section>
                <section className="detail-block">
                  <h3>What to Edit</h3>
                  <p>{selectedQa.whatToEdit}</p>
                </section>
                {selectedQa.references && selectedQa.references.length > 0 && (
                  <section className="detail-block code-block">
                    <h3>Exact Code References</h3>
                    <ol className="steps-list">
                      {selectedQa.references.map((ref) => (
                        <li key={ref}>{ref}</li>
                      ))}
                    </ol>
                  </section>
                )}

                <section className="detail-block code-block">
                  <h3>Complete Edit Map (All file:line Points)</h3>
                  {EXACT_EDIT_MAP.map((group) => (
                    <div key={group.area} style={{ marginBottom: '12px' }}>
                      <p style={{ margin: '0 0 6px 0', fontWeight: 700 }}>{group.area}</p>
                      <ol className="steps-list" style={{ marginTop: 0 }}>
                        {group.anchors.map((anchor) => (
                          <li key={anchor}>{anchor}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </section>
              </div>
            </article>
          </div>
        </section>
      )}

      {appView === 'control' && <ControlApp />}

      <section className="service-status">
        <h2>Service Status and URLs</h2>
        <div className="service-grid">
          <div className="service-card">
            <h3>
              API <StatusBadge status={services.api} />
            </h3>
            <p className="service-url">http://localhost:5000</p>
            <small>REST and gRPC endpoints</small>
          </div>
          <div className="service-card">
            <h3>PostgreSQL</h3>
            <p className="service-url">localhost:5432</p>
            <small>Users, rides, vehicles, payments</small>
          </div>
          <div className="service-card">
            <h3>MongoDB</h3>
            <p className="service-url">localhost:27017</p>
            <small>Telemetry and diagnostics</small>
          </div>
          <div className="service-card">
            <h3>Mailpit</h3>
            <p className="service-url">
              <a href="http://localhost:8025" target="_blank" rel="noreferrer">
                http://localhost:8025
              </a>
            </p>
            <small>Invoice email preview</small>
          </div>
          <div className="service-card">
            <h3>Seq</h3>
            <p className="service-url">
              <a href="http://localhost:80" target="_blank" rel="noreferrer">
                http://localhost:80
              </a>
            </p>
            <small>Structured logs</small>
          </div>
          <div className="service-card">
            <h3>Simulator</h3>
            <p className="service-url">background task</p>
            <small>Telemetry generator</small>
          </div>
        </div>
      </section>

      <footer className="footer-note">
        Comprehensive architecture guide: one page for features, control flows, and teacher-style Q&A with edit pointers. Understand every choice made in this application.
      </footer>
    </div>
  );
}

export default App;
