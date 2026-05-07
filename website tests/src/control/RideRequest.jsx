import React, { useState } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export default function RideRequest({ token, passengerId }) {
  const [pickupLat, setPickupLat] = useState(51.054);
  const [pickupLng, setPickupLng] = useState(3.721);
  const [dropLat, setDropLat] = useState(51.049);
  const [dropLng, setDropLng] = useState(3.741);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    const body = {
      passengerId: passengerId ?? '00000000-0000-0000-0000-000000000000',
      pickupLat,
      pickupLng,
      dropoffLat: dropLat,
      dropoffLng: dropLng,
      pickupAddress: 'Start', dropoffAddress: 'End'
    };
    const res = await fetch(`${API_BASE}/api/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setMsg('Request failed: ' + res.statusText);
    } else {
      const j = await res.json();
      setMsg('Ride created: ' + JSON.stringify(j));
    }
  };

  return (
    <form className="control-form" onSubmit={submit}>
      <div className="form-head">
        <div>
          <h3>Request Ride</h3>
          <p>Coordinates are preloaded for a one-click demo ride.</p>
        </div>
        <span className="form-badge">Prefilled</span>
      </div>
      <div className="form-grid form-grid--two">
        <label>Pickup Lat<input value={pickupLat} onChange={(e) => setPickupLat(Number(e.target.value))} /></label>
        <label>Pickup Lng<input value={pickupLng} onChange={(e) => setPickupLng(Number(e.target.value))} /></label>
        <label>Dropoff Lat<input value={dropLat} onChange={(e) => setDropLat(Number(e.target.value))} /></label>
        <label>Dropoff Lng<input value={dropLng} onChange={(e) => setDropLng(Number(e.target.value))} /></label>
      </div>
      <div className="actions">
        <button type="submit">Request</button>
        <button type="button" className="secondary" onClick={() => { setPickupLat(51.054); setPickupLng(3.721); setDropLat(51.049); setDropLng(3.741); }}>Reset demo</button>
      </div>
      {msg && <div className="info">{msg}</div>}
    </form>
  );
}
