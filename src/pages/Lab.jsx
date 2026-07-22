import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import SearchPicker, { makePatientFetcher } from '../components/SearchPicker';

const patientFetcher = makePatientFetcher(api);

const STATUS_BADGE = { pending: 'wait', completed: 'ok' };

export default function Lab() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState(null); // { order, results }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderPatient, setOrderPatient] = useState(null);
  const [testName, setTestName] = useState('');

  const [resultText, setResultText] = useState('');
  const [resultFile, setResultFile] = useState(null);

  const canOrder = user?.role === 'doctor' || user?.role === 'admin';
  const canEnterResult = user?.role === 'nurse' || user?.role === 'doctor' || user?.role === 'admin';

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { orders } = await api.lab.orders(statusFilter ? { status: statusFilter } : {});
      setOrders(orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function openOrder(id) {
    setError('');
    try {
      const data = await api.lab.getOrder(id);
      setSelected(data);
      setResultText('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    setError('');
    if (!orderPatient || !testName) {
      setError('Please select a patient and enter a test name.');
      return;
    }
    try {
      await api.lab.createOrder({ patient_id: orderPatient.id, test_name: testName });
      setOrderPatient(null);
      setTestName('');
      setShowOrderForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddResult(e) {
    e.preventDefault();
    setError('');
    if (!resultText.trim() && !resultFile) {
      setError('Please enter a result or attach a file.');
      return;
    }
    try {
      await api.lab.addResult(selected.order.id, { result_text: resultText, file: resultFile });
      const refreshed = await api.lab.getOrder(selected.order.id);
      setSelected(refreshed);
      setResultText('');
      setResultFile(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Laboratory</div>
          <h1>Lab orders</h1>
        </div>
        {canOrder && (
          <button className="btn btn-primary" onClick={() => setShowOrderForm((s) => !s)}>
            {showOrderForm ? 'Cancel' : '+ Order test'}
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showOrderForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Order a test</h3>
          <form onSubmit={handleCreateOrder}>
            <div className="form-row">
              <SearchPicker label="Patient" required value={orderPatient} onSelect={setOrderPatient} fetchResults={patientFetcher} placeholder="Search patient by name or code…" />
              <div className="field">
                <label>Test name</label>
                <input required placeholder="e.g. Complete Blood Count" value={testName} onChange={(e) => setTestName(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary">Order test</button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3>Orders</h3>
            <select style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <p style={{ color: 'var(--muted)' }}>Loading…</p>
          ) : orders.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No lab orders found.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Patient</th><th>Test</th><th>Ordered by</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.patient_name} <span className="mono" style={{ color: 'var(--muted)' }}>({o.patient_code})</span></td>
                    <td>{o.test_name}</td>
                    <td>{o.ordered_by_name}</td>
                    <td><span className={`badge ${STATUS_BADGE[o.status]}`}>{o.status}</span></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openOrder(o.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card" style={{ width: 380 }}>
            <h3 style={{ marginBottom: 2 }}>{selected.order.test_name}</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 2 }}>{selected.order.patient_name}</p>
            <p className="mono" style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 14 }}>
              {selected.order.patient_code} · ordered {new Date(selected.order.ordered_at).toLocaleDateString()}
            </p>

            {selected.results.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No result entered yet.</p>
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
                    Entered by {r.entered_by_name} — {new Date(r.entered_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}

            {canEnterResult && selected.order.status === 'pending' && (
              <form onSubmit={handleAddResult} style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Result text</label>
                  <textarea rows={4} value={resultText} onChange={(e) => setResultText(e.target.value)} placeholder="Enter test result…" />
                </div>
                <div className="field">
                  <label>Attach file (X-ray, scanned report — PDF/JPG/PNG, max 10MB)</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setResultFile(e.target.files[0] || null)} />
                </div>
                <button className="btn btn-primary btn-sm">Save result</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
