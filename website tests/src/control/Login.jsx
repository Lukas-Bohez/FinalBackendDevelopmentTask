import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const DEMO_USER = {
  email: 'passenger@novadrive.local',
  password: 'Password123!',
};

export default function Login({ onLogin }) {
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState(DEMO_USER.password);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Login failed');
      const body = await res.json();
      onLogin(body);
      setSuccess('Logged in with the demo account.');
    } catch (err) { setError(String(err)); }
  };

  return (
    <form className="control-form" onSubmit={submit}>
      <div className="form-head">
        <div>
          <h3>Login</h3>
          <p>Pre-filled with the demo passenger account (passenger@novadrive.local).</p>
        </div>
        <span className="form-badge">One click</span>
      </div>
      <div className="form-grid">
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      </div>
      <div className="actions">
        <button type="submit">Login</button>
        <button type="button" className="secondary" onClick={() => { setEmail(DEMO_USER.email); setPassword(DEMO_USER.password); }}>Reset demo</button>
      </div>
      {error && <div className="error">{error}</div>}
      {success && <div className="info">{success}</div>}
    </form>
  );
}
