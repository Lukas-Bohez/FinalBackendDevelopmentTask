import React, { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export default function TelemetryViewer() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLatest();
  }, []);

  const fetchLatest = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      setError(null);
      setLoading(true);

      // Fetch both real telemetry and active rides
      const [telemetryRes, ridesRes] = await Promise.all([fetch(`${API_BASE}/api/telemetry/latest?limit=20`, { signal: controller.signal }).catch((e) => ({ ok: false })), fetch(`${API_BASE}/api/telemetry/active-rides`, { signal: controller.signal }).catch((e) => ({ ok: false }))]);

      let combined = [];

      if (telemetryRes.ok) {
        const telemetryData = await telemetryRes.json();
        combined = combined.concat(telemetryData || []);
      }

      if (ridesRes.ok) {
        const ridesData = await ridesRes.json();
        combined = combined.concat(ridesData || []);
      }

      // Sort by timestamp (newest first)
      combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (combined.length === 0) {
        setItems([]);
        setError('No telemetry or active rides available. Check if simulator is running or create a ride request.');
        return;
      }

      setItems(combined);
    } catch (e) {
      setItems([]);
      setError('Telemetry and rides service are not available right now.');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className='telemetry-panel'>
      <div className='form-head'>
        <div>
          <h3>Latest telemetry</h3>
          <p>Auto-loaded when the screen opens. Shows real telemetry + active rides. Refresh anytime.</p>
        </div>
        <span className='form-badge'>Live</span>
      </div>
      <div className='actions'>
        <button onClick={fetchLatest}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      {error && <div className='info'>{error}</div>}
      <div className='telemetry-list'>
        {items.map((it, index) => (
          <div key={`${it.vehicleId}-${it.timestamp}-${index}`} className='telemetry-item' style={{ borderLeft: it.isRide ? '4px solid #ff6b6b' : '4px solid #51cf66' }}>
            <div>
              <strong>{it.displayName || it.vehicleId}</strong>
              {it.isRide ? ' (Ride)' : ' (Telemetry)'}@ {new Date(it.timestamp).toLocaleString()}
            </div>
            <div>
              Lat:{it.latitude.toFixed(4)} Lng:{it.longitude.toFixed(4)} Speed:{it.speedKmh} km/h Battery:{it.batteryPercent}% Temp:{it.internalTempC}°C
            </div>
          </div>
        ))}
        {items.length === 0 && <div className='empty'>No telemetry</div>}
      </div>
    </div>
  );
}
