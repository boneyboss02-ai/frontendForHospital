import { useEffect, useState } from 'react';
import { api } from '../../api/client';

const STATUS_BADGE = { pending: 'wait', completed: 'ok' };

export default function PortalLabResults() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null); // { order, results }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { orders } = await api.portal.labResults();
      setOrders(orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openOrder(id) {
    setError('');
    try {
      const data = await api.portal.getLabResult(id);
      setSelected(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Patient portal</div>
          <h1>Lab results</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          {loading ? (
            <p style={{ color: 'var(--muted)' }}>Loading…</p>
          ) : orders.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No lab tests on file.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Test</th><th>Ordered by</th><th>Date</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.test_name}</td>
                    <td>{o.ordered_by_name}</td>
                    <td>{new Date(o.ordered_at).toLocaleDateString()}</td>
                    <td><span className={`badge ${STATUS_BADGE[o.status]}`}>{o.status}</span></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openOrder(o.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card" style={{ width: 380 }}>
            <h3 style={{ marginBottom: 2 }}>{selected.order.test_name}</h3>
            <p className="mono" style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 14 }}>
              Ordered {new Date(selected.order.ordered_at).toLocaleDateString()} by {selected.order.ordered_by_name}
            </p>

            {selected.results.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Result not ready yet.</p>
            ) : (
              selected.results.map((r) => (
                <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  {r.result_text && <div style={{ fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>{r.result_text}</div>}
                  {r.file_name && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ display: 'inline-block', marginTop: 6 }}
                      onClick={() => api.lab.openFile(r.id).catch((err) => setError(err.message))}
                    >
                      📎 {r.file_name}
                    </button>
                  )}
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
                    {new Date(r.entered_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
