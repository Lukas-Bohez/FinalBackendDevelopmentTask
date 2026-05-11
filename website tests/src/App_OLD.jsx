import React, { useMemo, useState, useEffect } from 'react';
import ControlApp from './control/ControlApp';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const FEATURE_SECTIONS = [
  {
    id: 'bootstrap',
    title: 'Single-file launch',
    tags: ['bootstrap', 'docker', 'setup', 'double click'],
    file: 'bootstrap.ps1 / bootstrap.sh',
    summary: 'Starts the whole stack from one entrypoint, with OS detection, Docker setup, cert generation, restore, health checks, migrations, and simulator startup.',
    why: 'This is the easiest path for a demo: one file, no manual setup, and clear status output while the stack comes up.',
    detailed: 'The bootstrap script is the single entry point for the entire system. Whether you\'re on Windows (PowerShell), macOS, or Linux (Bash), the script detects your OS, ensures Docker is running, generates TLS certificates for local HTTPS, builds all Docker images, starts the composition of services, waits for health checks to pass, runs database migrations, starts the simulator in the background, and finally prints out all service URLs and demo credentials for immediate use.',
    how: 'The script checks the environment, creates missing local files, runs compose, waits for health endpoints, and then prints service URLs and demo credentials.',
    steps: [
      'Detect OS (Windows/Linux/macOS)',
      'Verify Docker is installed and running',
      'Generate self-signed TLS certificates if missing',
      'Create .env file with default credentials',
      'Run "docker compose up --build"',
      'Poll service health endpoints until all pass',
      'Run database migrations (EF Core)',
      'Start the telemetry simulator',
      'Display summary with all service URLs'
    ],
    excerpt: [
      'detect_os',
      'install_docker_if_missing',
      'ensure_env_file',
      'generate_tls_certs',
      'docker compose up --build -d',
      'wait_for_services',
    ],
  },
  {
    id: 'compose',
    title: 'Service topology',
    tags: ['compose', 'postgres', 'mongo', 'mailpit', 'seq'],
    file: 'docker-compose.yml',
    summary: 'Declares the API, databases, email catcher, log server, and simulator with health checks and named volumes.',
    why: 'A single compose file makes the architecture visible to assessors and keeps the local environment reproducible.',
    detailed: 'Docker Compose orchestrates six services that work together: the .NET API handles business logic and exposes REST and gRPC endpoints; PostgreSQL stores core entities (users, rides, vehicles, payments); MongoDB stores high-volume telemetry and diagnostics; Mailpit catches outgoing emails so reviewers can inspect receipts without a real mail server; Seq aggregates structured logs; and the simulator generates realistic telemetry in the background. All services use health checks and depend on each other in the correct order.',
    how: 'Each service reads from .env, exposes the required ports, and waits for its dependencies using health checks.',
    services: [
      { name: 'API', port: '5000', type: 'REST/gRPC', purpose: 'Business logic and endpoints' },
      { name: 'PostgreSQL', port: '5432', type: 'Database', purpose: 'Core transactional data' },
      { name: 'MongoDB', port: '27017', type: 'NoSQL', purpose: 'Telemetry and diagnostics' },
      { name: 'Mailpit', port: '8025', type: 'SMTP/Web', purpose: 'Email inspection' },
      { name: 'Seq', port: '80', type: 'Logs', purpose: 'Structured log aggregation' },
      { name: 'Simulator', port: 'N/A', type: 'Client', purpose: 'Background telemetry sender' },
    ],
    excerpt: [
      'api',
      'postgres',
      'mongo',
      'mailpit',
      'seq',
      'simulator',
    ],
  },
  {
    id: 'auth',
    title: 'Auth and login',
    tags: ['jwt', 'register', 'login', 'password'],
    file: 'final/Program.cs + Services/AuthService.cs',
    summary: 'Registers passengers, hashes passwords, logs users in, and issues JWTs that protect the public API.',
    why: 'The platform needs a straightforward token-based identity layer that works offline and inside Docker.',
    detailed: 'User authentication uses JWT tokens. Users register with email and password, inputs are validated, and passwords are stored as bcrypt hashes. On login, credentials are verified and the API issues a signed JWT containing user id, role, and email claims. The token currently expires after 8 hours and must be sent as a Bearer token for protected endpoints.',
    how: 'The API validates the DTO, checks for duplicate email addresses, hashes passwords, and returns a signed token for later requests.',
    excerpt: [
      'ValidateAsync(dto)',
      'HashPassword(dto.Password)',
      'GenerateJwtToken(user)',
      'Results.Created(...)',
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing engine',
    tags: ['fare', 'vat', 'discount', 'loyalty'],
    file: 'final/Services/PricingService.cs',
    summary: 'Computes fares with distance, duration, vehicle multipliers, night surcharge, loyalty discount, promo codes, VAT, and a minimum fare.',
    why: 'This is the most testable business rule in the project, so the UI explains it step by step instead of hiding it behind a button.',
    detailed: 'The fare calculation is deterministic and pure: given the same inputs, it always produces the same output. The base fare is €2.50. Then the system adds distance charges (€1.10 per km) and duration charges (€0.30 per minute). Vehicle type applies a multiplier: regular cars are 1.0×, premium is 1.5×, and budget is 0.8×. If the ride completes between 22:00 and 06:00, a 30% night surcharge is added. If the user has a loyalty account and has completed 10+ rides, they receive a 5% loyalty discount. If a valid promo code is applied, an additional percentage discount is deducted. Finally, 21% VAT is calculated on the subtotal, and the total is rounded to 2 decimal places. A minimum fare of €3.50 ensures very short rides are still profitable.',
    how: 'The service is pure: it receives the inputs, applies the rules in order, and returns a breakdown object for invoices and tests.',
    excerpt: [
      'BASE = 2.50 + distance * 1.10 + duration * 0.30',
      'VehicleType => multiplier',
      'Night surcharge 22:00-06:00',
      'VAT 21%',
      'Round to 2 decimals',
    ],
  },
  {
    id: 'rides',
    title: 'Ride lifecycle',
    tags: ['rides', 'vehicle assignment', 'invoice', 'email'],
    file: 'final/Program.cs + repositories/services',
    summary: 'Requests a ride, assigns a vehicle, marks it complete, creates payment records, generates an invoice, and sends email.',
    why: 'Assessors can follow the state transition from requested ride to completion without reading multiple files.',
    detailed: 'A ride follows a clear state machine: it starts in Requested status when the user submits pickup/dropoff coordinates. The system then queries PostgreSQL for the nearest available vehicle within a 5km radius and assigns it. While en route, the vehicle posts telemetry updates (location, speed, battery) which are stored in MongoDB. When the driver reaches the destination, they mark the ride as Completed. The system then calculates the fare using the PricingService, creates a Payment record with the total amount, generates an invoice PDF with all fare breakdowns, and triggers an email with the PDF attachment through the InvoiceEmailService. All state transitions are logged to Seq for debugging.',
    how: 'The handler calls the repositories and the pricing service, persists the ride, and triggers invoice generation on completion.',
    excerpt: [
      'MapPost("/api/rides")',
      'GetNearestActiveAsync(...)',
      'ride.Status = RideStatus.Completed',
      'GenerateInvoiceAsync(...)',
    ],
  },
  {
    id: 'telemetry',
    title: 'Telemetry ingest',
    tags: ['telemetry', 'mongo', 'gRPC', 'simulator'],
    file: 'final/Program.cs + Grpc/TelemetryGrpcService.cs',
    summary: 'Accepts high-volume telemetry and diagnostics data and stores it in MongoDB with indexes designed for time-based queries.',
    why: 'Telemetry is the write-heavy part of the system, so keeping it separate makes the design easier to defend.',
    detailed: 'Vehicles and the simulator send telemetry snapshots with location, speed, battery, and temperature fields. The API exposes REST telemetry endpoints and one unary gRPC method called Send for ingest. Telemetry is stored in MongoDB, while local demo mode uses fast timeouts with fallback demo data so the UI does not hang when Mongo is unavailable. Diagnostics are stored separately through /api/sensors/diagnostics.',
    how: 'The API accepts telemetry snapshots, the simulator posts them continuously, and MongoDB stores them for dashboard queries.',
    excerpt: [
      'MapPost("/api/telemetry")',
      'MapPost("/api/sensors/diagnostics")',
      'TelemetryService.Send (unary gRPC)',
      'GetLatestAsync(limit)',
    ],
  },
  {
    id: 'email',
    title: 'Receipt email',
    tags: ['mailpit', 'receipt', 'invoice', 'background'],
    file: 'final/Services/InvoiceEmailService.cs',
    summary: 'Builds a receipt message with the PDF attached and sends it through SMTP or writes to a local outbox.',
    why: 'Emails must not block the user request, and Mailpit gives an easy demo target the reviewer can inspect in a browser.',
    detailed: 'After a ride completes and the invoice is generated, the InvoiceEmailService is called asynchronously so it doesn\'t slow down the API response. The service constructs an HTML email body with the fare breakdown, VAT, and total. It attaches the invoice PDF that was generated by the PdfService. Then it connects to the SMTP server (configured in .env, typically Mailpit on localhost:1025 in development) and sends the message. The email includes the user\'s confirmation ID, ride summary, and a link back to the app. In production, this points to a real SMTP relay; locally, Mailpit catches it for review.',
    how: 'The service creates an email body, attaches the invoice PDF, and uses the configured SMTP server or local fallback.',
    excerpt: [
      'SendInvoiceAsync(...)',
      'multipart/mixed',
      'Attachment(pdfPath, "application/pdf")',
      'Mailpit UI on :8025',
    ],
  },
  {
    id: 'ui',
    title: 'This explanation UI',
    tags: ['search', 'presentation', 'demo', 'guide'],
    file: 'website tests/src/App.jsx',
    summary: 'Interactive guide with search, light/dark mode, live status checks, and side-by-side code & explanation.',
    why: 'You asked for a presentation-friendly interface where questions can be answered immediately from the app itself.',
    detailed: 'This page serves as the primary demo interface. It indexes all core features with detailed explanations of the why (business rationale), how (technical implementation), and what (code excerpts and file paths). A search box filters features by title, tags, file name, and content in real-time. The design supports both light and dark modes so it works well in any presentation setting. Live health checks show the current status of each service (API, Seq, databases, etc.). Tabs let you toggle between the feature guide, service status, live endpoints, and other tools.',
    how: 'The page indexes the core features in memory and filters them live from the search box.',
    excerpt: [
      'useMemo(() => filter features)',
      'searchQuery',
      'selectedFeature',
      'live health checks',
      'theme toggle',
    ],
  },
];

const FEATURE_EXPLAINER_MAP = {
  bootstrap: {
    answer30s: 'The launcher is an orchestration script: it validates prerequisites, starts compose services in order, waits on health checks, applies setup tasks, and prints demo URLs. It exists to remove manual setup friction during demos and grading.',
    exactEdits: [
      'Launch Nova Drive.cmd:1 (Windows entrypoint)',
      'docker-compose.yml:1 (service graph the launcher starts)',
      'docker-compose.yml:30 (API healthcheck gate)',
      'docker-compose.yml:84 (Mailpit healthcheck gate)',
    ],
    checklist: [
      'Keep health checks deterministic so startup waits are reliable.',
      'When adding a service, add ports + depends_on + healthcheck.',
      'Verify printed URLs match mapped ports in compose.',
    ],
  },
  compose: {
    answer30s: 'docker-compose.yml is the deployment topology for local/dev: each service has image/build config, environment, ports, dependencies, and health checks. This file is the single source for container wiring.',
    exactEdits: [
      'docker-compose.yml:1 (services start)',
      'docker-compose.yml:3 (api service definition)',
      'docker-compose.yml:45 (postgres)',
      'docker-compose.yml:63 (mongo)',
      'docker-compose.yml:73 (mailpit)',
      'docker-compose.yml:104 (website)',
    ],
    checklist: [
      'Update env vars in .env and compose together.',
      'Add healthcheck for every dependency-gated service.',
      'Avoid port collisions before changing host mappings.',
    ],
  },
  auth: {
    answer30s: 'Auth is split cleanly: Program.cs exposes register/login endpoints, while AuthService handles hashing and JWT generation. Endpoints validate inputs, enforce unique email, and return a signed token.',
    exactEdits: [
      'final/Program.cs:225 (register endpoint)',
      'final/Program.cs:250 (login endpoint)',
      'final/Program.cs:71 (JWT validation settings)',
      'final/Services/AuthService.cs:32 (GenerateJwtToken)',
      'final/Validators/RegisterValidator.cs:1 (validation rules)',
    ],
    checklist: [
      'Keep issuer/audience/key aligned between generation and validation.',
      'If adding claims, update consumers that read claims.',
      'Never store plain passwords; keep BCrypt flow intact.',
    ],
  },
  pricing: {
    answer30s: 'Pricing is centralized in one deterministic method, so business rules are testable and explainable. Endpoint code only validates request and calls PricingService.',
    exactEdits: [
      'final/Program.cs:270 (pricing endpoint)',
      'final/Services/PricingService.cs:36 (CalculatePriceAsync)',
      'final.Tests/PricingServiceTests.cs:1 (expected rule behavior)',
    ],
    checklist: [
      'Change constants and formulas only in PricingService.',
      'Keep rounding and minimum fare policy explicit.',
      'Update/add tests when changing discount or VAT logic.',
    ],
  },
  rides: {
    answer30s: 'Ride lifecycle is orchestration in Program.cs: create ride, estimate fare, persist state, then complete ride with payment, invoice generation, and email send.',
    exactEdits: [
      'final/Program.cs:287 (ride creation)',
      'final/Program.cs:343 (ride completion)',
      'final/Models/Ride.cs:5 (ride entity fields)',
      'final/Services/PdfService.cs:17 (invoice pdf generation)',
      'final/Services/InvoiceEmailService.cs:21 (invoice email send)',
    ],
    checklist: [
      'Update entity + DTO + endpoint when adding ride fields.',
      'Keep completion idempotency checks for already-completed rides.',
      'Confirm payment/invoice/email side effects after logic changes.',
    ],
  },
  telemetry: {
    answer30s: 'Telemetry uses both REST and unary gRPC ingest. Mongo-backed services have short timeouts and fallback demo data to keep UI responsive when telemetry storage is unavailable.',
    exactEdits: [
      'final/Protos/telemetry.proto:1 (protobuf schema)',
      'final/Protos/telemetry.proto:5 (Send RPC contract)',
      'final/Grpc/TelemetryGrpcService.cs:20 (gRPC mapping)',
      'final/Program.cs:392 (REST telemetry post)',
      'final/Services/TelemetryService.cs:33 (QueryTimeout)',
      'final/Services/TelemetryService.cs:77 (fallback demo data)',
      'final/Services/SensorDiagnosticsService.cs:47 (diagnostics timeout)',
    ],
    checklist: [
      'If proto changes, update server mapping and clients together.',
      'Keep timeout and fallback behavior aligned with UI expectations.',
      'Preserve stable protobuf field numbers for compatibility.',
    ],
  },
  email: {
    answer30s: 'InvoiceEmailService sends via SMTP when configured, otherwise writes .eml to outbox fallback. PdfService builds the invoice PDF content and path used by email logic.',
    exactEdits: [
      'final/Services/InvoiceEmailService.cs:21 (SendInvoiceAsync fallback logic)',
      'final/Services/InvoiceEmailService.cs:66 (SMTP send path)',
      'final/Services/PdfService.cs:17 (GenerateInvoicePdf)',
      'final/Program.cs:372 (PDF generation call)',
      'final/Program.cs:378 (invoice email trigger)',
    ],
    checklist: [
      'Keep SMTP and outbox fallback both working in dev.',
      'If invoice content changes, reflect in both PDF and email text.',
      'Ensure attachment mime type remains application/pdf.',
    ],
  },
  ui: {
    answer30s: 'App.jsx is the presentation control center: feature explorer, teacher Q&A, control UI switch, and search/indexing logic all live there for demo-first navigation.',
    exactEdits: [
      'website tests/src/App.jsx:4 (API base source)',
      'website tests/src/App.jsx:518 (app view state)',
      'website tests/src/App.jsx:611 (Feature Explorer render)',
      'website tests/src/App.jsx:667 (Teacher Q&A render)',
      'website tests/src/control/ControlApp.jsx:14 (control shell)',
    ],
    checklist: [
      'Add new top-level modes via appView + hero buttons + conditional render.',
      'Keep searchable text arrays updated when adding new sections.',
      'Update styles.css if adding new panel patterns.',
    ],
  },
};

const TEACHER_QA = [
  {
    id: 'qa-proto',
    question: 'What does the proto file do?',
    shortAnswer: 'It defines the gRPC contract: service, methods, and message schemas with stable field numbers.',
    explain: 'The proto file is the wire contract. It declares TelemetryService.Send and the TelemetryEntry/TelemetryAck messages. Field numbers are part of the binary protocol and should never be reused for different meanings.',
    whereToEdit: 'final/Protos/telemetry.proto',
    whatToEdit: 'Add fields with new numbers, keep existing numbers stable, then update server mapping code.',
    references: [
      'final/Protos/telemetry.proto:1 (proto3 syntax)',
      'final/Protos/telemetry.proto:4 (service TelemetryService)',
      'final/Protos/telemetry.proto:5 (rpc Send)',
      'final/Grpc/TelemetryGrpcService.cs:20 (maps request to domain model)',
    ],
  },
  {
    id: 'qa-grpc',
    question: 'Why is gRPC used here and what does it do?',
    shortAnswer: 'It provides a strongly typed telemetry ingest endpoint using protobuf over HTTP/2.',
    explain: 'In this app, gRPC handles telemetry ingest with one unary RPC method called Send. It reduces JSON parsing overhead and enforces strict contracts. REST is still used for browser-facing CRUD APIs, while gRPC fits service-to-service telemetry ingestion.',
    whereToEdit: 'final/Grpc/TelemetryGrpcService.cs + final/Program.cs + final/Protos/telemetry.proto',
    whatToEdit: 'Change contract in proto, implement mapping in TelemetryGrpcService, and keep registration/mapping in Program.cs.',
    references: [
      'final/Program.cs:94 (builder.Services.AddGrpc)',
      'final/Program.cs:200 (app.MapGrpcService)',
      'final/Grpc/TelemetryGrpcService.cs:9 (service class)',
      'final/Grpc/TelemetryGrpcService.cs:20 (Send RPC implementation)',
    ],
  },
  {
    id: 'qa-http2',
    question: 'What is HTTP/2 and why does it matter for gRPC?',
    shortAnswer: 'HTTP/2 enables multiplexing, binary framing, and efficient long-lived connections used by gRPC.',
    explain: 'gRPC is designed for HTTP/2 transport. Compared with plain HTTP/1.1 JSON APIs, HTTP/2 supports multiplexing many calls on one connection, header compression, and lower framing overhead. That helps throughput and latency for frequent telemetry calls.',
    whereToEdit: 'Concept + ASP.NET hosting config (if transport settings are changed)',
    whatToEdit: 'Usually no app code change required; keep gRPC endpoint mapped and ensure environment supports HTTP/2.',
    references: [
      'final/Program.cs:200 (gRPC endpoint is mapped here)',
      'final/Protos/telemetry.proto:5 (RPC contract that runs over HTTP/2)',
    ],
  },
  {
    id: 'qa-protobuf-vs-json',
    question: 'Protobuf vs JSON: what is the difference in this project?',
    shortAnswer: 'gRPC uses protobuf for compact typed messages; REST uses JSON for broad browser compatibility.',
    explain: 'Protobuf messages are schema-first and binary, which can be smaller and faster for machine-to-machine communication. JSON endpoints are easier to inspect and use from frontend tools. This project uses both: protobuf for telemetry ingest, JSON for app APIs.',
    whereToEdit: 'final/Protos/telemetry.proto + final/Program.cs route groups',
    whatToEdit: 'Use protobuf changes for gRPC contracts and DTO/route changes for JSON endpoints.',
    references: [
      'final/Protos/telemetry.proto:1 (protobuf schema)',
      'final/Program.cs:270 (JSON pricing endpoint example)',
      'final/Program.cs:225 (JSON auth register endpoint example)',
    ],
  },
  {
    id: 'qa-migrations',
    question: 'What were migrations for?',
    shortAnswer: 'Migrations are EF Core schema history for reproducible SQL database evolution.',
    explain: 'InitialCreate creates the first schema and indexes. The model snapshot represents the latest model for diff generation. Startup applies migrations for non-SQLite providers; SQLite demo mode uses EnsureCreated fallback.',
    whereToEdit: 'final/Models + final/Data/NovaDriveContext.cs',
    whatToEdit: 'Update models and fluent mappings, then generate a new migration.',
    references: [
      'final/Migrations/20260216120000_InitialCreate.cs:8 (InitialCreate migration)',
      'final/Migrations/NovaDriveContextModelSnapshot.cs:1 (snapshot)',
      'final/Data/NovaDriveContext.cs:18 (model mapping)',
      'final/Program.cs:108 (Migrate or EnsureCreated path)',
    ],
  },
  {
    id: 'qa-db-provider',
    question: 'How do SQLite and PostgreSQL switching work?',
    shortAnswer: 'Program.cs reads Database:Provider and wires DbContext to sqlite or postgres.',
    explain: 'The app chooses provider at startup. sqlite is friendly for local/demo mode, postgres for production-like environments. This avoids docker dependency for local testing while keeping production schema support.',
    whereToEdit: 'final/Program.cs + final/appsettings.Development.json',
    whatToEdit: 'Set Database.Provider and the corresponding connection strings.',
    references: [
      'final/Program.cs:22 (reads Database:Provider)',
      'final/Program.cs:25 (UseSqlite branch)',
      'final/Program.cs:32 (UseNpgsql branch)',
      'final/appsettings.Development.json:1 (local provider config)',
    ],
  },
  {
    id: 'qa-endpoints',
    question: 'Where are API endpoints defined?',
    shortAnswer: 'Minimal API route groups are declared centrally in Program.cs.',
    explain: 'Each group maps handlers by domain: auth, pricing, rides, telemetry, diagnostics, tickets, and admin. Handlers call validators, repositories, and services.',
    whereToEdit: 'final/Program.cs',
    whatToEdit: 'Add routes in the relevant MapGroup and keep auth/tag conventions aligned.',
    references: [
      'final/Program.cs:225 (auth register)',
      'final/Program.cs:250 (auth login)',
      'final/Program.cs:270 (pricing estimate)',
      'final/Program.cs:287 (/api/rides)',
      'final/Program.cs:385 (/api/telemetry)',
    ],
  },
  {
    id: 'qa-pricing',
    question: 'Where do I change fare rules?',
    shortAnswer: 'PricingService.CalculatePriceAsync is the single source of fare logic.',
    explain: 'Distance, duration, multipliers, discounts, VAT, and minimum fare are applied in deterministic order. This is intentionally centralized for easier testing and explanation.',
    whereToEdit: 'final/Services/PricingService.cs',
    whatToEdit: 'Adjust constants/formulas and keep rounding/minimum fare behavior coherent.',
    references: [
      'final/Services/PricingService.cs:36 (CalculatePriceAsync)',
      'final/Program.cs:270 (endpoint that calls pricing)',
      'final.Tests/PricingServiceTests.cs:1 (tests to keep aligned)',
    ],
  },
  {
    id: 'qa-token',
    question: 'Where do I change JWT lifetime and claims?',
    shortAnswer: 'AuthService generates tokens, Program.cs validates them.',
    explain: 'GenerateJwtToken sets claims and expiration. Program.cs configures bearer token validation parameters. Both sides must match issuer/audience/key.',
    whereToEdit: 'final/Services/AuthService.cs + final/Program.cs',
    whatToEdit: 'Modify token expiration/claims in AuthService and validation options in Program.cs.',
    references: [
      'final/Services/AuthService.cs:32 (GenerateJwtToken)',
      'final/Program.cs:69 (AddJwtBearer validation settings)',
      'final/Program.cs:250 (login endpoint returning token)',
    ],
  },
  {
    id: 'qa-telemetry-timeout',
    question: 'Why does telemetry not hang anymore?',
    shortAnswer: 'Telemetry and diagnostics use short Mongo timeouts plus demo fallback responses.',
    explain: 'Mongo queries are wrapped with a 2-second timeout. If Mongo is unavailable, services return demo entries so UI remains responsive instead of waiting for long server-selection timeouts.',
    whereToEdit: 'final/Services/TelemetryService.cs + final/Services/SensorDiagnosticsService.cs',
    whatToEdit: 'Tune QueryTimeout and fallback data generators.',
    references: [
      'final/Services/TelemetryService.cs:33 (QueryTimeout)',
      'final/Services/TelemetryService.cs:77 (fallback CreateDemoTelemetry)',
      'final/Services/SensorDiagnosticsService.cs:39 (QueryTimeout)',
      'final/Services/SensorDiagnosticsService.cs:83 (fallback CreateDemoDiagnostics)',
    ],
  },
  {
    id: 'qa-seed',
    question: 'Where do demo users and vehicles come from?',
    shortAnswer: 'Startup seeding in Program.cs inserts demo data when missing.',
    explain: 'After DB initialization, Program.cs checks existing records and inserts admin/passenger users, demo vehicles, and discount codes. This makes demos reproducible.',
    whereToEdit: 'final/Program.cs',
    whatToEdit: 'Edit seed users/passwords/vehicles/discounts in startup scope.',
    references: [
      'final/Program.cs:105 (migrate/seed block starts)',
      'final/Program.cs:127 (admin seed)',
      'final/Program.cs:139 (passenger seed)',
      'final/Program.cs:151 (vehicle seed)',
    ],
  },
  {
    id: 'qa-ride-flow',
    question: 'Where is ride request and completion logic?',
    shortAnswer: 'Ride handlers are in Program.cs under /api/rides.',
    explain: 'Request builds a ride from coordinates and pricing result. Completion updates status, awards loyalty points, creates payment, generates PDF, and sends invoice email.',
    whereToEdit: 'final/Program.cs + invoice services',
    whatToEdit: 'Change request/complete handlers and related PDF/email service logic.',
    references: [
      'final/Program.cs:287 (create ride endpoint)',
      'final/Program.cs:339 (complete ride endpoint)',
      'final/Services/PdfService.cs:1 (invoice pdf generation)',
      'final/Services/InvoiceEmailService.cs:1 (invoice email)',
    ],
  },
  {
    id: 'qa-front-api',
    question: 'Where does frontend API base URL come from?',
    shortAnswer: 'Components read VITE_API_BASE and default to relative URLs.',
    explain: 'Frontend API calls are built from import.meta.env.VITE_API_BASE. If empty, relative paths are used, which works with local same-host setups.',
    whereToEdit: 'website tests/src/App.jsx + control components',
    whatToEdit: 'Adjust API_BASE constants and fetch path usage.',
    references: [
      'website tests/src/App.jsx:4 (API_BASE)',
      'website tests/src/control/ControlApp.jsx:7 (API_BASE)',
      'website tests/src/control/TelemetryViewer.jsx:2 (API_BASE usage)',
    ],
  },
  {
    id: 'qa-ui-switch',
    question: 'Where do I change app screens and navigation?',
    shortAnswer: 'App.jsx manages appView and conditional rendering for study/control/qa views.',
    explain: 'The hero buttons set appView, and JSX blocks render based on that state. This is the central place to add a new top-level mode.',
    whereToEdit: 'website tests/src/App.jsx',
    whatToEdit: 'Update appView state, hero action buttons, and conditional render blocks.',
    references: [
      'website tests/src/App.jsx:321 (hero buttons)',
      'website tests/src/App.jsx:174 (appView state)',
      'website tests/src/App.jsx:453 (qa section render)',
    ],
  },
  {
    id: 'qa-control-ui',
    question: 'Where do I change one-click demo actions?',
    shortAnswer: 'ControlApp contains orchestration and quick action handlers.',
    explain: 'ControlApp coordinates token state, runAuthDemo/runRideDemo flows, and component switching. Child components handle specific forms and telemetry lists.',
    whereToEdit: 'website tests/src/control/ControlApp.jsx + child components',
    whatToEdit: 'Modify quick action handlers, notices, and selected view transitions.',
    references: [
      'website tests/src/control/ControlApp.jsx:14 (component root)',
      'website tests/src/control/ControlApp.jsx:47 (runAuthDemo)',
      'website tests/src/control/ControlApp.jsx:76 (runRideDemo)',
      'website tests/src/control/Login.jsx:9 (login form)',
    ],
  },
  {
    id: 'qa-schema-change',
    question: 'If I add a model field, what must I update?',
    shortAnswer: 'Update entity, mapping, migration, DTOs/handlers, and frontend usage where relevant.',
    explain: 'A real schema change is end-to-end: entity class, EF mapping, migration, API contracts, and UI bindings. Skipping one layer causes runtime or serialization mismatches.',
    whereToEdit: 'final/Models + Data + Migrations + DTOs + endpoints + UI',
    whatToEdit: 'Apply the field through all affected layers and add/adjust tests.',
    references: [
      'final/Models/Ride.cs:1 (entity example)',
      'final/Data/NovaDriveContext.cs:18 (mapping)',
      'final/Migrations/20260216120000_InitialCreate.cs:8 (migration pattern)',
      'final/Program.cs:287 (endpoint payload flow)',
    ],
  },
  {
    id: 'qa-observability',
    question: 'How do logging and metrics work?',
    shortAnswer: 'Serilog handles structured logging; Prometheus middleware exposes metrics endpoints.',
    explain: 'Program.cs configures Serilog from app configuration and adds Prometheus HTTP metrics. This gives observable request data and startup/runtime logs for demo and troubleshooting.',
    whereToEdit: 'final/Program.cs + final/appsettings.json',
    whatToEdit: 'Tune sinks/levels in settings and metric middleware placement in pipeline.',
    references: [
      'final/Program.cs:16 (UseSerilog)',
      'final/Program.cs:192 (UseHttpMetrics)',
      'final/Program.cs:201 (MapMetrics)',
    ],
  },
  {
    id: 'qa-study-endpoint',
    question: 'How is the study guide served?',
    shortAnswer: 'A dedicated endpoint serves StudyGuide.md as text/markdown.',
    explain: 'The /study endpoint resolves StudyGuide.md from content root and returns it as markdown. This keeps exam notes versioned with backend code.',
    whereToEdit: 'final/Program.cs + final/StudyGuide.md',
    whatToEdit: 'Adjust endpoint behavior in Program.cs or content in StudyGuide.md.',
    references: [
      'final/Program.cs:195 (MapGet /study)',
      'final/StudyGuide.md:1 (guide content)',
    ],
  },
];

const EXACT_EDIT_MAP = [
  {
    area: 'Startup and wiring',
    anchors: [
      'final/Program.cs:25 (database provider switch)',
      'final/Program.cs:71 (JWT bearer configuration)',
      'final/Program.cs:94 (AddGrpc registration)',
      'final/Program.cs:122 (Migrate invocation)',
      'final/Program.cs:195 (/study endpoint)',
      'final/Program.cs:200 (MapGrpcService)',
      'final/Program.cs:201 (MapMetrics)',
      'final/Program.cs:202 (MapHealthChecks)',
    ],
  },
  {
    area: 'Auth and tokens',
    anchors: [
      'final/Program.cs:225 (register endpoint)',
      'final/Program.cs:250 (login endpoint)',
      'final/Services/AuthService.cs:32 (GenerateJwtToken)',
      'final/Validators/RegisterValidator.cs:1 (register validation rules)',
    ],
  },
  {
    area: 'Pricing and fare logic',
    anchors: [
      'final/Program.cs:270 (pricing estimate endpoint)',
      'final/Services/PricingService.cs:36 (CalculatePriceAsync)',
      'final.Tests/PricingServiceTests.cs:1 (pricing tests)',
    ],
  },
  {
    area: 'Rides lifecycle',
    anchors: [
      'final/Program.cs:287 (create ride endpoint)',
      'final/Program.cs:343 (complete ride endpoint)',
      'final/Models/Ride.cs:5 (Ride model)',
      'final/Repositories/RideRepository.cs:1 (ride persistence)',
    ],
  },
  {
    area: 'Telemetry and diagnostics',
    anchors: [
      'final/Protos/telemetry.proto:1 (proto syntax)',
      'final/Protos/telemetry.proto:4 (gRPC service)',
      'final/Protos/telemetry.proto:5 (Send RPC)',
      'final/Grpc/TelemetryGrpcService.cs:20 (Send implementation)',
      'final/Program.cs:392 (telemetry POST endpoint)',
      'final/Program.cs:399 (telemetry latest endpoint)',
      'final/Services/TelemetryService.cs:33 (QueryTimeout)',
      'final/Services/TelemetryService.cs:77 (demo fallback)',
      'final/Program.cs:415 (diagnostics POST endpoint)',
      'final/Services/SensorDiagnosticsService.cs:47 (diagnostics timeout)',
    ],
  },
  {
    area: 'Invoices and email',
    anchors: [
      'final/Program.cs:372 (GenerateInvoicePdf usage)',
      'final/Program.cs:378 (SendInvoiceAsync usage)',
      'final/Services/PdfService.cs:17 (GenerateInvoicePdf)',
      'final/Services/InvoiceEmailService.cs:21 (SendInvoiceAsync)',
      'final/Services/InvoiceEmailService.cs:66 (SendViaSmtpAsync)',
    ],
  },
  {
    area: 'Database schema and migrations',
    anchors: [
      'final/Data/NovaDriveContext.cs:18 (OnModelCreating)',
      'final/Migrations/20260216120000_InitialCreate.cs:8 (initial migration)',
      'final/Migrations/NovaDriveContextModelSnapshot.cs:1 (schema snapshot)',
      'final/appsettings.Development.json:1 (dev sqlite settings)',
    ],
  },
  {
    area: 'Frontend app modes',
    anchors: [
      'website tests/src/App.jsx:4 (API_BASE)',
      'website tests/src/App.jsx:518 (appView state)',
      'website tests/src/App.jsx:611 (study view section)',
      'website tests/src/App.jsx:667 (qa view section)',
      'website tests/src/control/ControlApp.jsx:14 (control app root)',
      'website tests/src/control/TelemetryViewer.jsx:4 (telemetry view)',
    ],
  },
  {
    area: 'Infra and serving',
    anchors: [
      'docker-compose.yml:1 (service topology)',
      'docker-compose.yml:84 (mailpit healthcheck)',
      'website tests/nginx.conf:1 (frontend route/proxy behavior)',
      'Launch Nova Drive.cmd:1 (windows launcher)',
    ],
  },
];

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
  const [selectedQaId, setSelectedQaId] = useState('qa-proto');
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
      } catch (_) { if (mounted) setServices((p) => ({ ...p, api: { healthy: false } })); }
    };
    checkApiHealth();
    const id = setInterval(checkApiHealth, 5000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const filteredSections = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return FEATURE_SECTIONS;
    return FEATURE_SECTIONS.filter((section) => {
      const searchable = [
        section.title, section.summary, section.why, section.detailed ?? '', section.how, section.file,
        ...section.tags, ...section.excerpt, ...(section.steps ?? [])
      ].join(' ').toLowerCase();
      return searchable.includes(needle);
    });
  }, [searchQuery]);

  const selectedFeature = filteredSections.find((s) => s.id === selectedId) ?? FEATURE_SECTIONS[0];
  const selectedFeatureGuide = FEATURE_EXPLAINER_MAP[selectedFeature.id] ?? null;

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

  // expose setter globally for quick toggle
  window.setAppView = setAppView;

  return (
    <div className="shell" data-theme={theme}>
      <header className="hero">
        <div className="hero__copy">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="pill">Nova Drive Demo</div>
            <button type="button" className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>

          <h1>Complete ride-hailing platform in a single click.</h1>
          <p>Launch the full stack, then explain architecture, business rules, and code from one page.</p>

          <div className="hero__actions">
            <button type="button" onClick={() => setAppView('study')}>Explore features</button>
            <button type="button" className="secondary" onClick={() => setAppView('study')}>Service status</button>
            <button type="button" className="secondary" onClick={() => setAppView('qa')}>Teacher Q&A</button>
            <button type="button" className="secondary" onClick={() => setAppView('control')}>Control UI</button>
          </div>
        </div>

        <aside className="hero__card">
          <h2>Get started</h2>
          <ol>
            <li><strong>Windows:</strong> double-click Launch Nova Drive.cmd</li>
            <li><strong>Linux/macOS:</strong> run ./bootstrap.sh</li>
            <li>Wait for containers to become healthy</li>
            <li>Use the search to present any feature</li>
          </ol>
        </aside>
      </header>

      {appView === 'study' && (
        <section className="unified-explorer">
          <div className="explorer-header">
            <h2>Feature Explorer</h2>
            <p>Search once, then explain business value and code in the same view.</p>
          </div>
          <div className="notice-row" style={{ marginBottom: '14px' }}>Updated: each feature now includes a teacher-ready 30-second answer, exact file:line edit points, and a safe change checklist.</div>

          <div className="explorer-grid">
            <div className="explorer-sidebar">
              <label className="search">
                <span>Search features</span>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="pricing, telemetry, auth, compose..." />
              </label>

              <div className="feature-list">
                {filteredSections.map((section) => (
                  <button key={section.id} type="button" className={selectedFeature?.id === section.id ? 'feature-card active' : 'feature-card'} onClick={() => setSelectedId(section.id)}>
                    <span className="feature-card__title">{section.title}</span>
                    <span className="feature-card__file">{section.file}</span>
                    <span className="feature-card__summary">{section.summary}</span>
                  </button>
                ))}
                {filteredSections.length === 0 && <div className="empty-state">No matches. Try pricing, telemetry, email, or auth.</div>}
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
                <section className="detail-block"><h3>Overview</h3><p>{selectedFeature.summary}</p></section>
                <section className="detail-block"><h3>Why this design</h3><p>{selectedFeature.why}</p></section>
                <section className="detail-block"><h3>Technical details</h3><p>{selectedFeature.detailed ?? selectedFeature.how}</p></section>
                <section className="detail-block"><h3>How it works</h3><p>{selectedFeature.how}</p></section>

                {selectedFeatureGuide && (
                  <section className="detail-block code-block"><h3>Teacher-ready answer (30s)</h3><p>{selectedFeatureGuide.answer30s}</p></section>
                )}

                {selectedFeatureGuide && selectedFeatureGuide.exactEdits?.length > 0 && (
                  <section className="detail-block code-block"><h3>Exact file:line edit points</h3><ol className="steps-list">{selectedFeatureGuide.exactEdits.map((anchor) => <li key={anchor}>{anchor}</li>)}</ol></section>
                )}

                {selectedFeatureGuide && selectedFeatureGuide.checklist?.length > 0 && (
                  <section className="detail-block code-block"><h3>If you change this feature</h3><ol className="steps-list">{selectedFeatureGuide.checklist.map((step) => <li key={step}>{step}</li>)}</ol></section>
                )}

                {selectedFeature.steps && selectedFeature.steps.length > 0 && (
                  <section className="detail-block code-block"><h3>Step by step</h3><ol className="steps-list">{selectedFeature.steps.map((step) => <li key={step}>{step}</li>)}</ol></section>
                )}

                {selectedFeature.services && selectedFeature.services.length > 0 && (
                  <section className="detail-block code-block"><h3>Service map</h3><table className="services-table"><thead><tr><th>Service</th><th>Port</th><th>Type</th><th>Purpose</th></tr></thead><tbody>{selectedFeature.services.map((svc) => (<tr key={`${svc.name}-${svc.port}`}><td>{svc.name}</td><td><code>{svc.port}</code></td><td>{svc.type}</td><td>{svc.purpose}</td></tr>))}</tbody></table></section>
                )}

                <section className="detail-block code-block"><h3>Code path</h3><pre>{selectedFeature.excerpt.join('\n')}</pre></section>
              </div>
            </article>
          </div>
        </section>
      )}

      {appView === 'qa' && (
        <section className="unified-explorer">
          <div className="explorer-header">
            <h2>Teacher Q&A Prep</h2>
            <p>Use this during exam explanations: likely questions, concise answers, and exact places to edit in the codebase.</p>
          </div>

          <div className="explorer-grid">
            <div className="explorer-sidebar">
              <label className="search">
                <span>Search questions</span>
                <input value={qaQuery} onChange={(e) => setQaQuery(e.target.value)} placeholder="proto, migrations, grpc, pricing, where to edit..." />
              </label>

              <div className="feature-list">
                {filteredQa.map((item) => (
                  <button key={item.id} type="button" className={selectedQa?.id === item.id ? 'feature-card active' : 'feature-card'} onClick={() => setSelectedQaId(item.id)}>
                    <span className="feature-card__title">{item.question}</span>
                    <span className="feature-card__file">{item.whereToEdit}</span>
                    <span className="feature-card__summary">{item.shortAnswer}</span>
                  </button>
                ))}
                {filteredQa.length === 0 && <div className="empty-state">No matches. Try proto, migrations, grpc, or where to edit.</div>}
              </div>
            </div>

            <article className="detail-panel">
              <div className="detail-panel__header">
                <div>
                  <div className="pill pill--muted">Exam answer</div>
                  <h2>{selectedQa.question}</h2>
                </div>
              </div>

              <div className="detail-grid">
                <section className="detail-block">
                  <h3>Short answer</h3>
                  <p>{selectedQa.shortAnswer}</p>
                </section>
                <section className="detail-block">
                  <h3>Deeper explanation</h3>
                  <p>{selectedQa.explain}</p>
                </section>
                <section className="detail-block">
                  <h3>Where to edit</h3>
                  <p>{selectedQa.whereToEdit}</p>
                </section>
                <section className="detail-block">
                  <h3>What to edit</h3>
                  <p>{selectedQa.whatToEdit}</p>
                </section>
                {selectedQa.references && selectedQa.references.length > 0 && (
                  <section className="detail-block code-block">
                    <h3>Exact code references</h3>
                    <ol className="steps-list">
                      {selectedQa.references.map((ref) => <li key={ref}>{ref}</li>)}
                    </ol>
                  </section>
                )}

                <section className="detail-block code-block">
                  <h3>Exact Edit Map (file:line)</h3>
                  {EXACT_EDIT_MAP.map((group) => (
                    <div key={group.area} style={{ marginBottom: '12px' }}>
                      <p style={{ margin: '0 0 6px 0', fontWeight: 700 }}>{group.area}</p>
                      <ol className="steps-list" style={{ marginTop: 0 }}>
                        {group.anchors.map((anchor) => <li key={anchor}>{anchor}</li>)}
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
        <h2>Service Status And URLs</h2>
        <div className="service-grid">
          <div className="service-card"><h3>API <StatusBadge status={services.api} /></h3><p className="service-url">http://localhost:5000</p><small>REST and gRPC endpoints</small></div>
          <div className="service-card"><h3>PostgreSQL</h3><p className="service-url">localhost:5432</p><small>Users, rides, vehicles, payments</small></div>
          <div className="service-card"><h3>MongoDB</h3><p className="service-url">localhost:27017</p><small>Telemetry and diagnostics</small></div>
          <div className="service-card"><h3>Mailpit</h3><p className="service-url"><a href="http://localhost:8025" target="_blank" rel="noreferrer">http://localhost:8025</a></p><small>Invoice email preview</small></div>
          <div className="service-card"><h3>Seq</h3><p className="service-url"><a href="http://localhost:80" target="_blank" rel="noreferrer">http://localhost:80</a></p><small>Structured logs</small></div>
          <div className="service-card"><h3>Simulator</h3><p className="service-url">background task</p><small>Telemetry generator</small></div>
        </div>
      </section>

      <footer className="footer-note">One page for features, control flows, and teacher-style Q&A with edit pointers.</footer>
    </div>
  );
}

export default App;