import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import SearchPicker, { makePatientFetcher, makeMedicineFetcher } from '../components/SearchPicker';

const patientFetcher = makePatientFetcher(api);
const medicineFetcher = makeMedicineFetcher(api);

export default function Pharmacy() {
  const { user } = useAuth();
  const [tab, setTab] = useState('queue'); // 'queue' | 'inventory'
  const [medicines, setMedicines] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [openPrescription, setOpenPrescription] = useState(null); // { prescription, items }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showMedForm, setShowMedForm] = useState(false);
  const [medForm, setMedForm] = useState({ name: '', unit: 'tablet', stock_quantity: '', reorder_level: '10', unit_price: '' });

  const [showRxForm, setShowRxForm] = useState(false);
  const [rxPatient, setRxPatient] = useState(null);
  const [rxMedicine, setRxMedicine] = useState(null);
  const [rxDosage, setRxDosage] = useState('');
  const [rxFrequency, setRxFrequency] = useState('');
  const [rxDuration, setRxDuration] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [medsRes, rxRes] = await Promise.all([
        api.pharmacy.medicines(),
        api.pharmacy.prescriptions({ pending: 'true' }),
      ]);
      setMedicines(medsRes.medicines);
      setPrescriptions(rxRes.prescriptions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openRx(id) {
    setError('');
    try {
      const data = await api.pharmacy.getPrescription(id);
      setOpenPrescription(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDispense(itemId) {
    setError('');
    try {
      await api.pharmacy.dispenseItem(itemId);
      const refreshed = await api.pharmacy.getPrescription(openPrescription.prescription.id);
      setOpenPrescription(refreshed);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddMedicine(e) {
    e.preventDefault();
    setError('');
    try {
      await api.pharmacy.createMedicine({
        name: medForm.name,
        unit: medForm.unit,
        stock_quantity: Number(medForm.stock_quantity) || 0,
        reorder_level: Number(medForm.reorder_level) || 10,
        unit_price: Number(medForm.unit_price) || 0,
      });
      setMedForm({ name: '', unit: 'tablet', stock_quantity: '', reorder_level: '10', unit_price: '' });
      setShowMedForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRestock(id) {
    const raw = window.prompt('Quantity to add to stock:');
    const delta = Number(raw);
    if (!raw || Number.isNaN(delta)) return;
    setError('');
    try {
      await api.pharmacy.adjustStock(id, delta);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreatePrescription(e) {
    e.preventDefault();
    setError('');
    if (!rxPatient || !rxMedicine) {
      setError('Please select a patient and a medicine.');
      return;
    }
    try {
      await api.pharmacy.createPrescription({
        patient_id: rxPatient.id,
        items: [{
          medicine_id: rxMedicine.id,
          dosage: rxDosage,
          frequency: rxFrequency,
          duration_days: rxDuration ? Number(rxDuration) : undefined,
        }],
      });
      setRxPatient(null);
      setRxMedicine(null);
      setRxDosage('');
      setRxFrequency('');
      setRxDuration('');
      setShowRxForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Pharmacy</div>
          <h1>Medicines &amp; prescriptions</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {user?.role === 'doctor' && (
            <button className="btn btn-primary" onClick={() => setShowRxForm((s) => !s)}>
              {showRxForm ? 'Cancel' : '+ New prescription'}
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'pharmacist') && (
            <button className="btn btn-ghost" onClick={() => setShowMedForm((s) => !s)}>
              {showMedForm ? 'Cancel' : '+ Add medicine'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showRxForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>New prescription</h3>
          <form onSubmit={handleCreatePrescription}>
            <div className="form-row">
              <SearchPicker label="Patient" required value={rxPatient} onSelect={setRxPatient} fetchResults={patientFetcher} placeholder="Search patient by name or code…" />
              <SearchPicker label="Medicine" required value={rxMedicine} onSelect={setRxMedicine} fetchResults={medicineFetcher} placeholder="Search medicine…" />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Dosage</label>
                <input placeholder="e.g. 500mg" value={rxDosage} onChange={(e) => setRxDosage(e.target.value)} />
              </div>
              <div className="field">
                <label>Frequency</label>
                <input placeholder="e.g. twice daily" value={rxFrequency} onChange={(e) => setRxFrequency(e.target.value)} />
              </div>
              <div className="field">
                <label>Duration (days)</label>
                <input type="number" value={rxDuration} onChange={(e) => setRxDuration(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary">Save prescription</button>
          </form>
        </div>
      )}

      {showMedForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Add medicine to inventory</h3>
          <form onSubmit={handleAddMedicine}>
            <div className="form-row">
              <div className="field">
                <label>Name</label>
                <input required value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Unit</label>
                <select value={medForm.unit} onChange={(e) => setMedForm({ ...medForm, unit: e.target.value })}>
                  <option>tablet</option>
                  <option>capsule</option>
                  <option>ml</option>
                  <option>vial</option>
                  <option>bottle</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Starting stock</label>
                <input type="number" value={medForm.stock_quantity} onChange={(e) => setMedForm({ ...medForm, stock_quantity: e.target.value })} />
              </div>
              <div className="field">
                <label>Reorder level</label>
                <input type="number" value={medForm.reorder_level} onChange={(e) => setMedForm({ ...medForm, reorder_level: e.target.value })} />
              </div>
              <div className="field">
                <label>Unit price</label>
                <input type="number" step="0.01" value={medForm.unit_price} onChange={(e) => setMedForm({ ...medForm, unit_price: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary">Save medicine</button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button className={`btn btn-sm ${tab === 'queue' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('queue')}>
          Pharmacy queue
        </button>
        <button className={`btn btn-sm ${tab === 'inventory' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('inventory')}>
          Inventory
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : tab === 'queue' ? (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 14 }}>Pending prescriptions</h3>
            {prescriptions.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>Nothing waiting to be dispensed.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Patient</th><th>Prescribed by</th><th>Date</th><th></th></tr>
                </thead>
                <tbody>
                  {prescriptions.map((p) => (
                    <tr key={p.id}>
                      <td>{p.patient_name} <span className="mono" style={{ color: 'var(--muted)' }}>({p.patient_code})</span></td>
                      <td>{p.prescribed_by_name}</td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => openRx(p.id)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {openPrescription && (
            <div className="card" style={{ width: 380 }}>
              <h3 style={{ marginBottom: 4 }}>{openPrescription.prescription.patient_name}</h3>
              <p className="mono" style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 10 }}>
                {openPrescription.prescription.patient_code}
              </p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginBottom: 14 }}
                onClick={() => window.open(`/print/prescription/${openPrescription.prescription.id}`, '_blank')}
              >
                Print / Save as PDF
              </button>
              {openPrescription.items.map((item) => (
                <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{item.medicine_name}</strong>
                    <span className={`badge ${item.dispensed ? 'ok' : 'wait'}`}>{item.dispensed ? 'dispensed' : 'pending'}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>
                    {item.dosage} — {item.frequency} {item.duration_days ? `— ${item.duration_days}d` : ''}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Stock: {item.stock_quantity} {item.unit}</div>
                  {!item.dispensed && (
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => handleDispense(item.id)}>
                      Dispense
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr><th>Name</th><th>Unit</th><th>Stock</th><th>Reorder level</th><th>Price</th><th></th></tr>
            </thead>
            <tbody>
              {medicines.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.unit}</td>
                  <td className="mono">{m.stock_quantity}</td>
                  <td className="mono">{m.reorder_level}</td>
                  <td className="mono">{Number(m.unit_price).toFixed(2)}</td>
                  <td>
                    {m.stock_quantity <= m.reorder_level && <span className="badge wait" style={{ marginRight: 8 }}>low stock</span>}
                    {(user?.role === 'admin' || user?.role === 'pharmacist') && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRestock(m.id)}>Restock</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
