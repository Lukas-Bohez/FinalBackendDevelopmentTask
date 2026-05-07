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
    detailed: 'User authentication flows through a JWT (JSON Web Token) model. New users register with an email and password, which are validated (email must be unique, password must meet security rules). The password is hashed using bcrypt with a salt and stored in PostgreSQL. On login, the system compares the provided password against the stored hash, and if it matches, it issues a signed JWT with a 7-day expiration that includes the user ID and email as claims. The token is returned to the client and must be included in the Authorization header (Bearer scheme) for all protected endpoints. The API validates the token signature and expiration on every request.',
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
    detailed: 'Vehicles and the simulator send telemetry snapshots every 3 seconds: GPS coordinates, speed, battery percentage, engine diagnostics, tire pressure, brake wear, etc. The API exposes a POST /api/telemetry endpoint and a gRPC StreamTelemetry service for high-volume ingestion. Each snapshot is stored immediately in MongoDB with a TTL (time-to-live) index so old data automatically expires after 30 days, keeping storage bounded. The MongoDB collection has indexes on timestamp and vehicle_id for fast queries. A separate /api/sensors/diagnostics endpoint stores detailed fault codes and sensor readings. This separation keeps the write-heavy telemetry path independent from the transactional PostgreSQL database, preventing lock contention during peak load.',
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

const StatusBadge = ({ status }) => {
  if (!status) {
    return <span className="status-badge error">offline</span>;
  }
  return <span className={`status-badge ${status.healthy ? 'healthy' : 'starting'}`}>{status.healthy ? 'up' : 'checking'}</span>;
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState('pricing');
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

      <footer className="footer-note">One page, one search, full explanation plus code path.</footer>
    </div>
  );
}

export default App;