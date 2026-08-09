import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import SearchPicker, { makeDoctorFetcher, makePatientFetcher } from '../components/SearchPicker';

const doctorFetcher = makeDoctorFetcher(api);
const patientFetcher = makePatientFetcher(api);

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();

  const [from, setFrom] = useState(searchParams.get('from') || daysAgoISO(30));
  const [to, setTo] = useState(searchParams.get('to') || todayISO());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Per-visit profit breakdown — admin only (it exposes supply cost and
  // margin, not just top-line revenue). Its own patient/doctor filters,
  // separate from the date range above which drives the rest of the page.
  const [profitData, setProfitData] = useState(null);
  const [profitDoctor, setProfitDoctor] = useState(null);
  const [profitPatient, setProfitPatient] = useState(null);
  const [profitLoading, setProfitLoading] = useState(false);

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

  async function loadProfitability() {
    if (!isAdmin) return;
    setProfitLoading(true);
    try {
      const params = { from, to };
      if (profitDoctor) params.doctor_id = profitDoctor.id;
      if (profitPatient) params.patient_id = profitPatient.id;
      const result = await api.reports.profitability(params);
      setProfitData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setProfitLoading(false);
    }
  }

  useEffect(() => { load(); loadProfitability(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadProfitability(); }, [profitDoctor, profitPatient]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <button className="btn btn-primary" style={{ height: 38 }} onClick={() => { load(); loadProfitability(); }}>Apply</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : data && (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <Link to={`/billing?from=${from}&to=${to}`} className="stat-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div className="value">{data.revenue.toFixed(2)}</div>
              <div className="label">Revenue collected</div>
            </Link>
            <Link to={`/billing?from=${from}&to=${to}`} className="stat-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div className="value">{data.invoices_issued.count}</div>
              <div className="label">Invoices issued</div>
            </Link>
            <Link to="/patients" className="stat-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div className="value">{data.new_patients}</div>
              <div className="label">New patients</div>
            </Link>
            <Link to="/inventory?low_stock=true" className="stat-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div className="value">{data.low_stock_count}</div>
              <div className="label">Low stock items</div>
            </Link>
            {data.expenses !== undefined && (
              <>
                <Link to="/expenses" className="stat-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  <div className="value">{data.expenses.toFixed(2)}</div>
                  <div className="label">Expenses</div>
                </Link>
                {/* Profit is derived (revenue minus expenses) — there's no
                    separate page it maps to, so it's left as a plain card
                    rather than a link that would go nowhere useful. */}
                <div className="stat-card">
                  <div className="value" style={{ color: data.profit >= 0 ? 'inherit' : 'var(--red)' }}>{data.profit.toFixed(2)}</div>
                  <div className="label">Profit</div>
                </div>
              </>
            )}
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

            {data.expenses_by_category !== undefined && (
              <div className="card">
                <h3 style={{ marginBottom: 14 }}>Expenses by category</h3>
                {data.expenses_by_category.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No expenses recorded in this range.</p>
                ) : (
                  (() => {
                    const max = Math.max(...data.expenses_by_category.map((d) => d.total));
                    return data.expenses_by_category.map((d) => (
                      <BarRow key={d.category} label={d.category} value={d.total} max={max} formatValue={(v) => v.toFixed(2)} />
                    ));
                  })()
                )}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="card" style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ marginBottom: 2 }}>Profit by visit</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Revenue billed minus the cost of inventory used in that visit — e.g. a 1500 procedure
                    that used 300 worth of supplies shows as 1200 profit. Uses today's item prices, so
                    figures can shift slightly if a supply cost changes later.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ minWidth: 180 }}>
                    <SearchPicker label="Doctor" value={profitDoctor} onSelect={setProfitDoctor} fetchResults={doctorFetcher} placeholder="Any doctor…" />
                  </div>
                  <div style={{ minWidth: 180 }}>
                    <SearchPicker label="Patient" value={profitPatient} onSelect={setProfitPatient} fetchResults={patientFetcher} placeholder="Any patient…" />
                  </div>
                </div>
              </div>

              {profitLoading ? (
                <p style={{ color: 'var(--muted)' }}>Loading…</p>
              ) : profitData && (
                <>
                  <div className="stat-grid" style={{ marginBottom: 18 }}>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => document.getElementById('profit-visits-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                      <div className="value">{profitData.summary.gross_revenue.toFixed(2)}</div>
                      <div className="label">Revenue (procedures)</div>
                    </div>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => document.getElementById('profit-visits-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                      <div className="value">{profitData.summary.cost_of_supplies.toFixed(2)}</div>
                      <div className="label">Cost of supplies used</div>
                    </div>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => document.getElementById('profit-visits-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                      <div className="value">{profitData.summary.gross_profit.toFixed(2)}</div>
                      <div className="label">Gross profit</div>
                    </div>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => document.getElementById('profit-visits-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                      <div className="value" style={{ color: profitData.summary.net_profit >= 0 ? 'inherit' : 'var(--red)' }}>
                        {profitData.summary.net_profit.toFixed(2)}
                      </div>
                      <div className="label">Net profit (after expenses)</div>
                    </div>
                  </div>

                  {profitData.visits.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No completed visits with billing in this range.</p>
                  ) : (
                    <table id="profit-visits-table">
                      <thead>
                        <tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Revenue</th><th>Supply cost</th><th>Profit</th></tr>
                      </thead>
                      <tbody>
                        {profitData.visits.map((v) => (
                          <tr key={v.appointment_id}>
                            <td>{new Date(v.scheduled_at).toLocaleDateString()}</td>
                            <td>{v.patient_name}</td>
                            <td>{v.doctor_name}</td>
                            <td className="mono">{v.revenue.toFixed(2)}</td>
                            <td className="mono">{v.cost.toFixed(2)}</td>
                            <td className="mono" style={{ color: v.profit >= 0 ? 'inherit' : 'var(--red)' }}>{v.profit.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
