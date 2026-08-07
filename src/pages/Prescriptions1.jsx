import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import SearchPicker, { makePatientFetcher, makeMedicineFetcher } from '../components/SearchPicker';

const patientFetcher = makePatientFetcher(api);
const medicineFetcher = makeMedicineFetcher(api);

// Prescriptions are documentation only — the doctor writes it, the patient
// sees it in their portal (and takes it to an outside pharmacy). There's no
// in-house dispense/billing step; this clinic doesn't run its own pharmacy.
export default function Prescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [openPrescription, setOpenPrescription] = useState(null); // { prescription, items }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
      const rxRes = await api.prescriptions.list();
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
      const data = await api.prescriptions.get(id);
      setOpenPrescription(data);
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
      await api.prescriptions.create({
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
          <div className="eyebrow">Records</div>
          <h1>Prescriptions</h1>
        </div>
        {user?.role === 'doctor' && (
          <button className="btn btn-primary" onClick={() => setShowRxForm((s) => !s)}>
            {showRxForm ? 'Cancel' : '+ New prescription'}
          </button>
        )}
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

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 14 }}>All prescriptions</h3>
            {prescriptions.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No prescriptions yet.</p>
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
                  <strong style={{ fontSize: '0.9rem' }}>{item.medicine_name}</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>
                    {item.dosage} — {item.frequency} {item.duration_days ? `— ${item.duration_days}d` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
