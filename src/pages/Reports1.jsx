import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Simple horizontal bar row — no charting library, just a filled div sized
// by percentage of the max value in the set. Keeps this dependency-free.
function BarRow({ label, value, max, formatValue }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 3 }}>
        <span>{label}</span>
        <span className="mono" style={{ color: 'var(--muted)' }}>{formatValue ? formatValue(value) : value}</span>
      </div>
      <div style={{ background: 'var(--sky-100)', borderRadius: 100, height: 8 }}>
        <div style={{ width: `${pct}%`, background: 'var(--teal-500)', borderRadius: 100, height: 8 }} />
      </div>
    </div>
  );
}

export default function Reports() {
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await api.reports.overview({ from, to });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Business</div>
          <h1>Reports</h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ height: 38 }} onClick={load}>Apply</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : data && (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="value">{data.revenue.toFixed(2)}</div>
              <div className="label">Revenue collected</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.invoices_issued.count}</div>
              <div className="label">Invoices issued</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.new_patients}</div>
              <div className="label">New patients</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.low_stock_count}</div>
              <div className="label">Low stock items</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Revenue by day</h3>
              {data.revenue_by_day.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No payments recorded in this range.</p>
              ) : (
                (() => {
                  const max = Math.max(...data.revenue_by_day.map((d) => d.total));
                  return data.revenue_by_day.map((d) => (
                    <BarRow key={d.day} label={new Date(d.day).toLocaleDateString()} value={d.total} max={max} formatValue={(v) => v.toFixed(2)} />
                  ));
                })()
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Appointments by status</h3>
              {data.appointments_by_status.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No appointments in this range.</p>
              ) : (
                (() => {
                  const max = Math.max(...data.appointments_by_status.map((d) => d.count));
                  return data.appointments_by_status.map((d) => (
                    <BarRow key={d.status} label={d.status.replace('_', ' ')} value={d.count} max={max} />
                  ));
                })()
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Appointments by doctor</h3>
              {data.appointments_by_doctor.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No appointments in this range.</p>
              ) : (
                (() => {
                  const max = Math.max(...data.appointments_by_doctor.map((d) => d.count));
                  return data.appointments_by_doctor.map((d) => (
                    <BarRow key={d.doctor_name} label={d.doctor_name} value={d.count} max={max} />
                  ));
                })()
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Chair / room utilization</h3>
              {data.chair_utilization.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No rooms configured yet.</p>
              ) : (
                data.chair_utilization.map((r) => (
                  <BarRow
                    key={r.room_name}
                    label={r.room_name}
                    value={r.occupied}
                    max={r.total}
                    formatValue={() => `${r.occupied}/${r.total}`}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
