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
      'StreamTelemetry',
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

const TEACHER_QA = [
  {
    id: 'qa-proto',
    question: 'What does the proto file do?',
    shortAnswer: 'It defines the gRPC contract: service, methods, and message schemas with stable field numbers.',
    explain: 'The proto file is the wire contract for telemetry gRPC calls. It declares TelemetryService.Send and the TelemetryEntry and TelemetryAck message formats. Field numbers are the real protocol identity, so they must remain stable for backward compatibility.',
    whereToEdit: 'final/Protos/telemetry.proto',
    whatToEdit: 'Add or adjust message fields and method signatures. Keep existing field numbers stable; only add new numbers.',
  },
  {
    id: 'qa-migrations',
    question: 'What were migrations for?',
    shortAnswer: 'Migrations are EF Core schema history, used to create and evolve the SQL database safely.',
    explain: 'InitialCreate builds core SQL tables and indexes. The migration snapshot tracks the current model so future schema diffs can be generated. On startup, Program.cs applies migrations for non-SQLite providers, while SQLite demo mode uses EnsureCreated for resilience.',
    whereToEdit: 'final/Models + final/Data/NovaDriveContext.cs',
    whatToEdit: 'Change entity classes or fluent mappings, then generate a new migration. Do not hand-edit old migration history unless intentionally rewriting it.',
  },
  {
    id: 'qa-grpc',
    question: 'What does gRPC do in this app?',
    shortAnswer: 'It provides a typed telemetry ingest endpoint alongside REST.',
    explain: 'gRPC is used for telemetry ingest through TelemetryService.Send. The server maps protobuf data into domain telemetry entries and stores them via ITelemetryService. It is HTTP/2 and protobuf-based, while the rest of the app mainly uses JSON REST endpoints.',
    whereToEdit: 'final/Grpc/TelemetryGrpcService.cs + final/Program.cs + final/Protos/telemetry.proto',
    whatToEdit: 'Update contract in proto, update mapping logic in TelemetryGrpcService, and keep service registration and mapping in Program.cs.',
  },
  {
    id: 'qa-pricing',
    question: 'Where do I change fare rules?',
    shortAnswer: 'PricingService.cs contains all pricing rules in one deterministic function.',
    explain: 'Base fare, per-km and per-minute rates, vehicle multipliers, night surcharge, loyalty discount, promo discount, VAT, and minimum fare are all applied in PricingService.CalculatePriceAsync in a clear sequence.',
    whereToEdit: 'final/Services/PricingService.cs',
    whatToEdit: 'Tune constants and formulas inside CalculatePriceAsync. Keep rounding and minimum fare rules consistent with tests.',
  },
  {
    id: 'qa-token',
    question: 'Where do I change JWT lifetime or claims?',
    shortAnswer: 'AuthService.cs controls token creation and expiration.',
    explain: 'GenerateJwtToken defines claims (sub, role, email), signing key usage, issuer/audience, and token expiration. Program.cs configures JWT validation rules to match.',
    whereToEdit: 'final/Services/AuthService.cs + final/Program.cs',
    whatToEdit: 'Change expires in GenerateJwtToken and keep validation issuer/audience/signing key aligned in Program.cs.',
  },
  {
    id: 'qa-telemetry-timeout',
    question: 'Why does telemetry not hang anymore, and where can I tune it?',
    shortAnswer: 'Mongo calls use 2-second timeouts with fallback demo data.',
    explain: 'TelemetryService and SensorDiagnosticsService both apply short Mongo connection/query timeouts. On failure, they return generated demo entries so frontend views remain responsive in local development.',
    whereToEdit: 'final/Services/TelemetryService.cs + final/Services/SensorDiagnosticsService.cs',
    whatToEdit: 'Adjust QueryTimeout and fallback methods CreateDemoTelemetry/CreateDemoDiagnostics.',
  },
  {
    id: 'qa-db-provider',
    question: 'How do I switch between SQLite and PostgreSQL?',
    shortAnswer: 'Database provider is selected in Program.cs from configuration.',
    explain: 'Program.cs reads Database:Provider and configures DbContext accordingly. sqlite uses local file, otherwise the app uses PostgreSQL connection settings and migrations.',
    whereToEdit: 'final/Program.cs + final/appsettings.Development.json',
    whatToEdit: 'Set Database.Provider and connection strings. For local demos keep sqlite enabled in development settings.',
  },
  {
    id: 'qa-endpoints',
    question: 'Where are API endpoints defined?',
    shortAnswer: 'Most endpoints are Minimal API route groups in Program.cs.',
    explain: 'Auth, pricing, rides, telemetry, diagnostics, tickets, and admin groups are mapped in Program.cs. Route handlers call validators, repositories, and services.',
    whereToEdit: 'final/Program.cs',
    whatToEdit: 'Add or change route handlers in the relevant MapGroup section. Keep tags and auth requirements consistent.',
  },
  {
    id: 'qa-seed',
    question: 'Where do demo users/vehicles come from?',
    shortAnswer: 'Program.cs seeds them during startup in the migrate/seed block.',
    explain: 'After database initialization, Program.cs checks for existing records and inserts admin/passenger demo users, vehicles, and discount codes when missing.',
    whereToEdit: 'final/Program.cs',
    whatToEdit: 'Update seed emails/passwords/vehicles/discounts inside the startup scope block.',
  },
  {
    id: 'qa-ride-flow',
    question: 'Where is ride request and completion logic?',
    shortAnswer: 'Ride lifecycle handlers are in Program.cs under /api/rides.',
    explain: 'Request creates a ride from coordinates, estimates distance and duration, computes price, and stores it. Completion marks ride as completed, credits loyalty points, creates payment, generates PDF invoice, and sends email.',
    whereToEdit: 'final/Program.cs + final/Services/PdfService.cs + final/Services/InvoiceEmailService.cs',
    whatToEdit: 'Adjust request/complete handler logic and invoice/email service behavior as needed.',
  },
  {
    id: 'qa-front-api',
    question: 'Where does frontend API base URL come from?',
    shortAnswer: 'It uses VITE_API_BASE with fallback to same-origin paths.',
    explain: 'The frontend reads import.meta.env.VITE_API_BASE. If empty, requests are built from relative paths. This enables local proxy/same-host setups or explicit API host config.',
    whereToEdit: 'website tests/src/App.jsx + website tests/src/control/*',
    whatToEdit: 'Update API_BASE usage and environment variable wiring; keep endpoint paths consistent.',
  },
  {
    id: 'qa-ui-switch',
    question: 'Where do I change the main UI navigation views?',
    shortAnswer: 'App.jsx controls view state and which panels render.',
    explain: 'The UI switches between study, control, and teacher Q&A modes based on appView state. Hero buttons set the mode, and each mode renders a dedicated section.',
    whereToEdit: 'website tests/src/App.jsx',
    whatToEdit: 'Adjust appView state, hero action buttons, and conditional rendering blocks.',
  },
  {
    id: 'qa-control-ui',
    question: 'Where do I change one-click demo actions?',
    shortAnswer: 'ControlApp.jsx contains quick actions and flow orchestration.',
    explain: 'ControlApp manages login state, dashboard actions, ride demo, and transitions to specific forms. Subcomponents handle individual forms and telemetry listing.',
    whereToEdit: 'website tests/src/control/ControlApp.jsx and child components',
    whatToEdit: 'Edit runAuthDemo/runRideDemo, notices, and component props/flow.',
  },
  {
    id: 'qa-schema-change',
    question: 'If I add a field to a model, what exactly must I update?',
    shortAnswer: 'Update model, mapping, migration, DTO/endpoint, and UI where shown.',
    explain: 'A full schema change usually touches entity model, DbContext mapping, generated migration, request/response DTOs, route handlers, and frontend display/forms if the field is user-facing.',
    whereToEdit: 'final/Models + final/Data/NovaDriveContext.cs + final/DTOs + final/Program.cs + frontend components',
    whatToEdit: 'Apply end-to-end changes so storage, API contract, and UI stay consistent.',
  },
  {
    id: 'qa-observability',
    question: 'How do logging and metrics work here?',
    shortAnswer: 'Serilog handles logs; Prometheus middleware exposes metrics.',
    explain: 'Program.cs configures Serilog console output and Prometheus HTTP metrics middleware. This supports demo visibility and basic observability from startup onward.',
    whereToEdit: 'final/Program.cs + appsettings.json',
    whatToEdit: 'Adjust logging sinks/levels in configuration and metrics middleware placement in the pipeline.',
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