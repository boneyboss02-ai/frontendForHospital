import { useEffect, useState } from 'react';
import { api } from '../api/client';
import SearchPicker, { makePatientFetcher, makeDoctorFetcher } from '../components/SearchPicker';

const patientFetcher = makePatientFetcher(api);
const doctorFetcher = makeDoctorFetcher(api);

export default function Beds() {
  const [beds, setBeds] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAdmitForm, setShowAdmitForm] = useState(false);
  const [admitPatient, setAdmitPatient] = useState(null);
  const [admitDoctor, setAdmitDoctor] = useState(null);
  const [admitBedId, setAdmitBedId] = useState('');
  const [admitReason, setAdmitReason] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [bedsRes, admissionsRes] = await Promise.all([
        api.inpatient.beds(),
        api.inpatient.admissions({ status: 'admitted' }),
      ]);
      setBeds(bedsRes.beds);
      setAdmissions(admissionsRes.admissions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDischarge(admissionId) {
    const summary = window.prompt('Discharge summary (optional):') || '';
    try {
      await api.inpatient.discharge(admissionId, summary);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAdmit(e) {
    e.preventDefault();
    setError('');
    if (!admitPatient || !admitBedId) {
      setError('Please select a patient and a bed.');
      return;
    }
    try {
      await api.inpatient.admit({
        patient_id: admitPatient.id,
        bed_id: Number(admitBedId),
        attending_doctor_id: admitDoctor ? admitDoctor.id : undefined,
        admission_reason: admitReason,
      });
      setAdmitPatient(null);
      setAdmitDoctor(null);
      setAdmitBedId('');
      setAdmitReason('');
      setShowAdmitForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const availableBeds = beds.filter((b) => b.status === 'available');

  const wardGroups = beds.reduce((acc, bed) => {
    acc[bed.ward_name] = acc[bed.ward_name] || [];
    acc[bed.ward_name].push(bed);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Inpatient</div>
          <h1>Wards &amp; Beds</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdmitForm((s) => !s)}>
          {showAdmitForm ? 'Cancel' : '+ Admit patient'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showAdmitForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Admit patient</h3>
          <form onSubmit={handleAdmit}>
            <div className="form-row">
              <SearchPicker label="Patient" required value={admitPatient} onSelect={setAdmitPatient} fetchResults={patientFetcher} placeholder="Search patient by name or code…" />
              <SearchPicker label="Attending doctor" value={admitDoctor} onSelect={setAdmitDoctor} fetchResults={doctorFetcher} placeholder="Search doctor by name…" />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Bed *</label>
                <select required value={admitBedId} onChange={(e) => setAdmitBedId(e.target.value)}>
                  <option value="">Select an available bed</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>{b.ward_name} — {b.bed_number}</option>
                  ))}
                </select>
                {availableBeds.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--red)', marginTop: 4 }}>No beds currently available.</p>
                )}
              </div>
              <div className="field">
                <label>Admission reason</label>
                <input value={admitReason} onChange={(e) => setAdmitReason(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary">Admit</button>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 14 }}>Bed map</h3>
            {Object.keys(wardGroups).length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No wards configured yet.</p>
            ) : (
              <div className="ward-map">
                {Object.entries(wardGroups).map(([wardName, wardBeds]) => (
                  <div className="ward-block" key={wardName}>
                    <h3>{wardName}</h3>
                    <div className="bed-grid">
                      {wardBeds.map((bed) => (
                        <div key={bed.id} className={`bed-tile ${bed.status}`} title={bed.status}>
                          {bed.bed_number}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: '0.78rem', color: 'var(--muted)' }}>
              <span><span className="bed-tile available" style={{ display: 'inline-block', width: 12, height: 12, padding: 0, marginRight: 4 }}></span>Available</span>
              <span><span className="bed-tile occupied" style={{ display: 'inline-block', width: 12, height: 12, padding: 0, marginRight: 4 }}></span>Occupied</span>
              <span><span className="bed-tile cleaning" style={{ display: 'inline-block', width: 12, height: 12, padding: 0, marginRight: 4 }}></span>Cleaning</span>
              <span><span className="bed-tile maintenance" style={{ display: 'inline-block', width: 12, height: 12, padding: 0, marginRight: 4 }}></span>Maintenance</span>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Currently admitted</h3>
            {admissions.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No patients currently admitted.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Ward / Bed</th>
                    <th>Doctor</th>
                    <th>Admitted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((a) => (
                    <tr key={a.id}>
                      <td>{a.patient_name} <span className="mono" style={{ color: 'var(--muted)' }}>({a.patient_code})</span></td>
                      <td>{a.ward_name} / {a.bed_number}</td>
                      <td>{a.doctor_name || '—'}</td>
                      <td>{new Date(a.admitted_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDischarge(a.id)}>Discharge</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
