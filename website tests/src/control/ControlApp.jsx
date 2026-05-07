import React, { useEffect, useState } from 'react';
import Login from './Login';
import Register from './Register';
import RideRequest from './RideRequest';
import TelemetryViewer from './TelemetryViewer';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const DEMO_USER = {
  email: 'passenger@novadrive.local',
  password: 'Password123!',
  fullName: 'Demo Passenger',
};

export default function ControlApp() {
  const [view, setView] = useState('dashboard');
  const [token, setToken] = useState(localStorage.getItem('nova_token'));
  const [userId, setUserId] = useState(localStorage.getItem('nova_user_id'));
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState('Everything is prefilled. Click any tile to start.');
  const [lastRide, setLastRide] = useState(null);

  useEffect(() => {
    // expose setter so App can toggle view via global helper
    window.setAppView = (v) => setView(v === 'control' ? 'dashboard' : v);
  }, []);

  const onLogin = (result) => {
    const nextToken = result?.token ?? result;
    const nextUserId = result?.userId ?? result?.userID ?? null;
    setToken(nextToken);
    localStorage.setItem('nova_token', nextToken);
    if (nextUserId) {
      setUserId(nextUserId);
      localStorage.setItem('nova_user_id', nextUserId);
    }
    setView('dashboard');
  };
  const onLogout = () => { setToken(null); localStorage.removeItem('nova_token'); setView('dashboard'); };

  const apiRequest = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, options);
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : await response.text().catch(() => '');
    return { response, payload };
  };

  const runAuthDemo = async () => {
    setBusy('auth');
    setNotice('Running demo auth flow...');
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEMO_USER),
      }).catch(() => null);

      const login = await apiRequest('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: DEMO_USER.email, password: DEMO_USER.password }),
      });

      if (!login.response.ok) {
        throw new Error('Login failed');
      }

      onLogin(login.payload);
      setNotice('Demo login complete. You can now request a ride without typing anything.');
      setView('request');
    } catch (error) {
      setNotice(error.message ?? 'Auth demo failed');
    } finally {
      setBusy(null);
    }
  };

  const runRideDemo = async () => {
    setBusy('ride');
    setNotice('Submitting demo ride request...');
    try {
      if (!token || !userId) {
        await runAuthDemo();
      }

      const ride = await apiRequest('/api/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('nova_token') ? { Authorization: `Bearer ${localStorage.getItem('nova_token')}` } : {}),
        },
        body: JSON.stringify({
          passengerId: localStorage.getItem('nova_user_id') ?? userId,
          pickupLat: 51.054,
          pickupLng: 3.721,
          dropoffLat: 51.049,
          dropoffLng: 3.741,
          pickupAddress: 'Ghent Korenmarkt',
          dropoffAddress: 'Ghent Station',
        }),
      });

      if (!ride.response.ok) {
        throw new Error(ride.payload?.message ?? `Ride request failed (${ride.response.status})`);
      }

      setLastRide(ride.payload);
      setNotice(`Ride #${ride.payload?.id?.toString().slice(0, 8)} created: €${ride.payload?.estimatedFare?.toFixed(2) ?? '—'}`);
      setView('request');
    } catch (error) {
      setNotice(error.message ?? 'Ride demo failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="control-shell">
      <nav className="control-nav">
        <button onClick={() => setView('dashboard')}>Dashboard</button>
        <button onClick={() => setView('request')}>Request Ride</button>
        <button onClick={() => setView('telemetry')}>Telemetry</button>
        <div style={{ marginLeft: 'auto' }}>
          {token ? <button onClick={onLogout}>Logout</button> : <button onClick={() => setView('login')}>Login</button>}
        </div>
      </nav>

      <div className="control-body">
        {view === 'login' && <Login onLogin={onLogin} />}
        {view === 'register' && <Register />}
        {view === 'request' && <RideRequest token={token} passengerId={userId} />}
        {view === 'telemetry' && <TelemetryViewer />}
        {view === 'dashboard' && (
          <div className="dashboard-stack">
            <div className="dashboard-hero">
              <div>
                <div className="pill pill--muted">Control console</div>
                <h2>One-click demo actions</h2>
                <p>No typing needed. Everything uses demo defaults, and the most common flows can be triggered with a single click.</p>
              </div>
              <div className="dashboard-meta">
                <div><span>API</span><strong>{API_BASE || '/'}</strong></div>
                <div><span>Auth</span><strong>{token ? 'connected' : 'idle'}</strong></div>
              </div>
            </div>

            <div className="quick-grid">
              <button className="quick-card" onClick={runAuthDemo} disabled={busy !== null}>
                <span>Auth</span>
                <strong>{busy === 'auth' ? 'Running...' : 'Quick login + register'}</strong>
                <small>Uses the demo account already filled in.</small>
              </button>

              <button className="quick-card" onClick={runRideDemo} disabled={busy !== null}>
                <span>Ride</span>
                <strong>{busy === 'ride' ? 'Running...' : 'Create demo ride'}</strong>
                <small>Submits a prefilled ride request immediately.</small>
              </button>

              <button className="quick-card" onClick={() => setView('telemetry')}>
                <span>Telemetry</span>
                <strong>Open live data</strong>
                <small>Shows the latest vehicle data automatically.</small>
              </button>

              <button className="quick-card" onClick={() => setView('register')}>
                <span>Register form</span>
                <strong>Prefilled</strong>
                <small>No typing needed, just submit the defaults.</small>
              </button>
            </div>

            <div className="notice-row">{notice}</div>
          </div>
        )}
      </div>
    </div>
  );
}
