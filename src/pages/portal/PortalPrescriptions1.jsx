import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function PortalPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [selected, setSelected] = useState(null); // { prescription, items }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { prescriptions } = await api.portal.prescriptions();
      setPrescriptions(prescriptions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openPrescription(id) {
    setError('');
    try {
      const data = await api.portal.getPrescription(id);
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
          <h1>Prescriptions</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          {loading ? (
            <p style={{ color: 'var(--muted)' }}>Loading…</p>
          ) : prescriptions.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No prescriptions on file.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Prescribed by</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => (
                  <tr key={rx.id}>
                    <td>{rx.prescribed_by_name}</td>
                    <td>{new Date(rx.created_at).toLocaleDateString()}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openPrescription(rx.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card" style={{ width: 380 }}>
            <h3 style={{ marginBottom: 2 }}>Prescription</h3>
            <p className="mono" style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 10 }}>
              {new Date(selected.prescription.created_at).toLocaleString()} — {selected.prescription.prescribed_by_name}
            </p>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 14 }}
              onClick={() => window.open(`/print/prescription/${selected.prescription.id}`, '_blank')}
            >
              Print / Save as PDF
            </button>
            {selected.items.map((item) => (
              <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.medicine_name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                  {item.dosage} · {item.frequency} · {item.duration_days} days
                </div>
                <span className={`badge ${item.dispensed ? 'ok' : 'wait'}`} style={{ marginTop: 6, display: 'inline-block' }}>
                  {item.dispensed ? 'Dispensed' : 'Not yet dispensed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
