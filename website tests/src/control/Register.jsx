import React, { useState } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const DEMO_USER = {
  email: 'passenger@novadrive.local',
  password: 'Password123!',
  name: 'Demo Passenger',
};

export default function Register() {
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState(DEMO_USER.password);
  const [name, setName] = useState(DEMO_USER.name);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName: name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMsg('Failed: ' + (body.Message ?? res.statusText));
    } else {
      setMsg('Registered — check login');
    }
  };

  return (
    <form className="control-form" onSubmit={submit}>
      <div className="form-head">
        <div>
          <h3>Register</h3>
          <p>Prefilled demo user. Submit once to create the account.</p>
        </div>
        <span className="form-badge">Demo</span>
      </div>
      <div className="form-grid">
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      </div>
      <div className="actions">
        <button type="submit">Register</button>
        <button type="button" className="secondary" onClick={() => { setEmail(DEMO_USER.email); setName(DEMO_USER.name); setPassword(DEMO_USER.password); }}>Reset demo</button>
      </div>
      {msg && <div className="info">{msg}</div>}
    </form>
  );
}
