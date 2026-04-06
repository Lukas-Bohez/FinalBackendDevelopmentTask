import React, { useState } from 'react';

// use relative API by default so Docker static site + nginx proxy works
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export default function App() {
  const [distance, setDistance] = useState(5);
  const [duration, setDuration] = useState(12);
  const [vehicleType, setVehicleType] = useState('Standard');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // auth
  const [token, setToken] = useState(localStorage.getItem('nd_token') || '');
  const [userId, setUserId] = useState(localStorage.getItem('nd_user') || '');
  const [email, setEmail] = useState(localStorage.getItem('nd_user_email') || '');
  const [password, setPassword] = useState('');

  function logout() {
    setToken('');
    setUserId('');
    setEmail('');
    localStorage.removeItem('nd_token');
    localStorage.removeItem('nd_user');
    localStorage.removeItem('nd_user_email');
    setRides([]);
  }

  const [rides, setRides] = useState([]);
  const [pickup, setPickup] = useState('51.0,3.0');
  const [dropoff, setDropoff] = useState('51.01,3.01');
  const [logs, setLogs] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);

  async function getPrice(e) {
    e?.preventDefault();
    setLoading(true);
    const payload = {
      distanceKm: parseFloat(distance),
      durationMinutes: parseFloat(duration),
      vehicleType,
      startTime: new Date().toISOString(),
      loyaltyPoints: 240,
      discountCode: null,
    };

    const res = await fetch(`${API_BASE}/api/pricing/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert('Price request failed');
      setLoading(false);
      return;
    }

    const body = await res.json();
    setResult(body);
    setLoading(false);
  }

  async function register() {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName: 'Demo' }),
    });
    if (res.status === 201) alert('Registered — now login');
    else alert('Register failed');
  }

  async function login() {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return alert('Login failed');
    const body = await res.json();
    setToken(body.token);
    setUserId(body.userId);
    localStorage.setItem('nd_token', body.token);
    localStorage.setItem('nd_user', body.userId);
    localStorage.setItem('nd_user_email', email);
    fetchRides(body.userId, body.token);
  }

  async function fetchRides(uid = userId, tok = token) {
    if (!uid) return;
    const res = await fetch(`${API_BASE}/api/rides?passengerId=${uid}`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
    if (res.ok) setRides(await res.json());
  }

  async function createRide() {
    if (!userId) return alert('Login first');
    const [pl, pg] = pickup.split(',').map((x) => parseFloat(x));
    const [dl, dg] = dropoff.split(',').map((x) => parseFloat(x));
    const payload = { passengerId: userId, pickupLat: pl, pickupLng: pg, dropoffLat: dl, dropoffLng: dg, pickupAddress: 'Start', dropoffAddress: 'End' };
    const res = await fetch(`${API_BASE}/api/rides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return alert('Ride failed');
    const body = await res.json();
    alert('Ride requested: ' + body.id);
    fetchRides();
  }

  async function completeRide(rideId) {
    const res = await fetch(`${API_BASE}/api/rides/${rideId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert('Complete failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    fetchRides();
  }

  async function fetchTelemetry() {
    const res = await fetch(`${API_BASE}/api/telemetry/latest?limit=10`);
    if (!res.ok) return;
    setLogs(await res.json());
  }

  async function fetchDiagnostics() {
    const res = await fetch(`${API_BASE}/api/sensors/diagnostics/latest?limit=10`);
    if (!res.ok) return;
    setDiagnostics(await res.json());
  }

  return (
    <div style={{ fontFamily: 'Segoe UI, Roboto, Arial', maxWidth: 900, margin: '24px auto' }}>
      <h1>Nova Drive — Website test</h1>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
          <h3>Auth</h3>
          {token ? (
            <div>
              <div>
                <b>Logged in as:</b> {localStorage.getItem('nd_user_email') || email}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => fetchRides()}>Refresh rides</button>
                <button onClick={logout}>Logout</button>
              </div>
            </div>
          ) : (
            <>
              <input placeholder='email' value={email} onChange={(e) => setEmail(e.target.value)} />
              <input placeholder='password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={register}>Register</button>
                <button onClick={login}>Login</button>
              </div>
            </>
          )}

          <div style={{ marginTop: 8, fontSize: 12 }}>
            <b>Token:</b> <code style={{ wordBreak: 'break-all' }}>{token || 'not logged in'}</code>
          </div>
        </div>

        <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
          <h3>Price estimator</h3>
          <form onSubmit={getPrice} style={{ display: 'grid', gap: 8 }}>
            <label>
              Distance (km)
              <input type='number' step='0.1' value={distance} onChange={(e) => setDistance(e.target.value)} />
            </label>
            <label>
              Duration (minutes)
              <input type='number' step='1' value={duration} onChange={(e) => setDuration(e.target.value)} />
            </label>
            <label>
              Vehicle type
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                <option>Standard</option>
                <option>Van</option>
                <option>Luxury</option>
              </select>
            </label>
            <button type='submit'>Get price</button>
          </form>
          {result && <pre style={{ marginTop: 8, background: '#fafafa', padding: 8 }}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
      </section>

      <hr />

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
          <h3>Request ride</h3>
          <label>
            Pickup (lat,lng)
            <input value={pickup} onChange={(e) => setPickup(e.target.value)} />
          </label>
          <label>
            Dropoff (lat,lng)
            <input value={dropoff} onChange={(e) => setDropoff(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={createRide}>Request Ride</button>
            <button onClick={() => fetchRides()}>Refresh rides</button>
          </div>

          <h4 style={{ marginTop: 12 }}>My rides</h4>
          <div>
            {rides.map((r) => (
              <div key={r.id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <div>
                  <b>{r.id}</b> — {r.status} — {r.totalFare} {r.currency}
                </div>
                {r.status !== 'Completed' && (
                  <button onClick={() => completeRide(r.id)} style={{ marginTop: 6 }}>
                    Complete & download invoice
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
          <h3>Telemetry</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchTelemetry}>Load latest telemetry</button>
            <button onClick={fetchDiagnostics}>Load diagnostics</button>
          </div>
          <div style={{ marginTop: 8 }}>
            {logs.map((l) => (
              <div key={l._id} style={{ padding: 6, borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <b>{l.vehicleId}</b> @{new Date(l.timestamp).toLocaleTimeString()}
                </div>
                <div>
                  Lat:{l.latitude} Lon:{l.longitude} Speed:{l.speedKmh} Battery:{l.batteryPercent}%
                </div>
              </div>
            ))}
          </div>

          <h4 style={{ marginTop: 12 }}>Sensor diagnostics</h4>
          <div>
            {diagnostics.map((d) => (
              <div key={d._id} style={{ padding: 6, borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <b>{d.sensorType}</b> ({d.severity}) - {d.errorCode}
                </div>
                <div style={{ fontSize: 12 }}>
                  Vehicle {d.vehicleId} @{new Date(d.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr />
      <p style={{ fontSize: 12, color: '#666' }}>
        Run: <code>cd "website tests"; bun install; bun run dev</code> or use <code>npm</code>. When using Docker Compose the site will be available at <code>http://localhost:5173</code>.
      </p>
    </div>
  );
}
