import React, { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export default function TelemetryViewer() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { fetchLatest(); }, []);
  const fetchLatest = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/telemetry/latest?limit=20`, { signal: controller.signal });
      if (!res.ok) {
        setItems([]);
        setError('Telemetry service is temporarily unavailable.');
        return;
      }
      const j = await res.json();
      setItems(j);
    } catch (e) {
      setItems([]);
      setError('Telemetry is not available right now. Showing an empty state.');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="telemetry-panel">
      <div className="form-head">
        <div>
          <h3>Latest telemetry</h3>
          <p>Auto-loaded when the screen opens. You can refresh at any time.</p>
        </div>
        <span className="form-badge">Live</span>
      </div>
      <div className="actions">
        <button onClick={fetchLatest}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      {error && <div className="info">{error}</div>}
      <div className="telemetry-list">
        {items.map((it, index) => (
          <div key={`${it.vehicleId}-${it.timestamp}-${index}`} className="telemetry-item">
            <div><strong>{it.vehicleId}</strong> @ {new Date(it.timestamp).toLocaleString()}</div>
            <div>Lat:{it.latitude} Lng:{it.longitude} Speed:{it.speedKmh} km/h Battery:{it.batteryPercent}% Temp:{it.internalTempC}°C</div>
          </div>
        ))}
        {items.length === 0 && <div className="empty">No telemetry</div>}
      </div>
    </div>
  );
}
