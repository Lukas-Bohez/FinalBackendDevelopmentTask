import React, { useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const FEATURE_SECTIONS = [
  {
    id: 'bootstrap',
    title: 'Single-file launch',
    tags: ['bootstrap', 'docker', 'setup', 'double click'],
    file: 'bootstrap.ps1 / bootstrap.sh',
    summary: 'Starts the whole stack from one entrypoint, with OS detection, Docker setup, cert generation, restore, health checks, migrations, and simulator startup.',
    why: 'This is the easiest path for a demo: one file, no manual setup, and clear status output while the stack comes up.',
    how: 'The script checks the environment, creates missing local files, runs compose, waits for health endpoints, and then prints service URLs and demo credentials.',
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
    how: 'Each service reads from .env, exposes the required ports, and waits for its dependencies using health checks.',
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
    summary: 'Searches the code map and surfaces the most relevant explanation, rationale, and implementation notes.',
    why: 'You asked for a presentation-friendly interface where questions can be answered immediately from the app itself.',
    how: 'The page indexes the core features in memory and filters them live from the search box.',
    excerpt: [
      'useMemo(() => filter features)',
      'searchQuery',
      'selectedFeature',
      'Code Explorer tab',
    ],
  },
];

const LIVE_ENDPOINTS = [
  { label: 'API', value: 'http://localhost:5000' },
  { label: 'Health', value: 'http://localhost:5000/health' },
  { label: 'gRPC', value: 'http://localhost:5001' },
  { label: 'Mailpit', value: 'http://localhost:8025' },
  { label: 'Seq', value: 'http://localhost:80' },
];

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState('pricing');
  const [activeTab, setActiveTab] = useState('explore');

  const filteredSections = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
      return FEATURE_SECTIONS;
    }

    return FEATURE_SECTIONS.filter((section) => {
      const searchable = [section.title, section.summary, section.why, section.how, section.file, ...section.tags, ...section.excerpt].join(' ').toLowerCase();
      return searchable.includes(needle);
    });
  }, [searchQuery]);

  const selectedFeature = filteredSections.find((section) => section.id === selectedId)
    ?? FEATURE_SECTIONS.find((section) => section.id === selectedId)
    ?? filteredSections[0]
    ?? FEATURE_SECTIONS[0];

  const quickStats = [
    { label: 'searchable features', value: FEATURE_SECTIONS.length },
    { label: 'launch entrypoints', value: 1 },
    { label: 'docker services', value: 6 },
    { label: 'core domains explained', value: 8 },
  ];

  return (
    <div className="shell">
      <header className="hero">
        <div className="hero__copy">
          <div className="pill">Nova Drive presentation mode</div>
          <h1>Double-click, launch, search, explain.</h1>
          <p>
            This page is built for presenting the codebase. Search for a feature and it jumps straight to the code area,
            explains why it exists, and shows the implementation path in plain language.
          </p>

          <div className="hero__actions">
            <button type="button" onClick={() => setActiveTab('explore')}>Open code explorer</button>
            <button type="button" className="secondary" onClick={() => setActiveTab('launch')}>Launch instructions</button>
          </div>
        </div>

        <aside className="hero__card">
          <h2>How to run it</h2>
          <ol>
            <li>Double-click Launch Nova Drive.cmd on Windows, or run bootstrap.sh in WSL/macOS.</li>
            <li>Wait for the stack summary to appear.</li>
            <li>Open this site and use the search box to find the feature you want to explain.</li>
          </ol>
          <div className="stats">
            {quickStats.map((stat) => (
              <div key={stat.label} className="stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </aside>
      </header>

      <nav className="tabs" aria-label="Presentation tabs">
        <button type="button" className={activeTab === 'explore' ? 'tab active' : 'tab'} onClick={() => setActiveTab('explore')}>Code Explorer</button>
        <button type="button" className={activeTab === 'launch' ? 'tab active' : 'tab'} onClick={() => setActiveTab('launch')}>Launch</button>
        <button type="button" className={activeTab === 'api' ? 'tab active' : 'tab'} onClick={() => setActiveTab('api')}>Service URLs</button>
        <button type="button" className={activeTab === 'story' ? 'tab active' : 'tab'} onClick={() => setActiveTab('story')}>Why these choices</button>
      </nav>

      {activeTab === 'explore' && (
        <section className="workspace">
          <div className="workspace__sidebar">
            <label className="search">
              <span>Search functionality</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="pricing, login, telemetry, launch..."
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
                <div className="empty-state">No matches. Try a different keyword like “invoice” or “telemetry”.</div>
              )}
            </div>
          </div>

          <article className="detail-panel">
            <div className="detail-panel__header">
              <div>
                <div className="pill pill--muted">{selectedFeature.file}</div>
                <h2>{selectedFeature.title}</h2>
              </div>
              <div className="tag-row">
                {selectedFeature.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>

            <div className="detail-grid">
              <section className="detail-block">
                <h3>What it does</h3>
                <p>{selectedFeature.summary}</p>
              </section>
              <section className="detail-block">
                <h3>Why it is done this way</h3>
                <p>{selectedFeature.why}</p>
              </section>
              <section className="detail-block">
                <h3>How it works</h3>
                <p>{selectedFeature.how}</p>
              </section>
              <section className="detail-block code-block">
                <h3>Code path</h3>
                <pre>{selectedFeature.excerpt.join('\n')}</pre>
              </section>
            </div>
          </article>
        </section>
      )}

      {activeTab === 'launch' && (
        <section className="story-panel">
          <div className="story-card">
            <h2>One entrypoint</h2>
            <p>
              For Windows users, double-click <strong>Launch Nova Drive.cmd</strong>. It calls the PowerShell bootstrap,
              which creates the environment file, generates certificates, starts Docker, restores packages, and brings the
              services online.
            </p>
            <pre>{[
              'Launch Nova Drive.cmd',
              '  -> bootstrap.ps1',
              '    -> docker compose pull',
              '    -> docker compose up --build -d',
              '    -> wait for health checks',
            ].join('\n')}</pre>
          </div>

          <div className="story-card">
            <h2>Presentation checklist</h2>
            <ul>
              <li>Open Code Explorer and search for pricing, telemetry, or invoice.</li>
              <li>Click a feature card to show the file and reasoning.</li>
              <li>Use the launch tab to show the zero-manual-step startup path.</li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === 'api' && (
        <section className="story-panel grid-3">
          {LIVE_ENDPOINTS.map((endpoint) => (
            <div key={endpoint.label} className="story-card">
              <h2>{endpoint.label}</h2>
              <p>{endpoint.value}</p>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'story' && (
        <section className="story-panel">
          <div className="story-card">
            <h2>Why this UI works for a defence</h2>
            <p>
              It maps a natural question like “how is pricing calculated?” to the responsible source file, then answers
              with the code path, the reason for the design, and the implementation summary all in one place.
            </p>
          </div>

          <div className="story-card">
            <h2>What to search</h2>
            <div className="tag-row">
              {['bootstrap', 'pricing', 'ride', 'telemetry', 'email', 'compose', 'auth', 'simulator'].map((word) => (
                <button key={word} type="button" className="tag tag--button" onClick={() => { setSearchQuery(word); setActiveTab('explore'); }}>
                  {word}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="footer-note">
        Run the backend first, then use the explorer to explain the code without leaving the browser.
      </footer>
    </div>
  );
}

export default App;