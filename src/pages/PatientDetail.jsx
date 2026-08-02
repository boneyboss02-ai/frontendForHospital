import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

function ageFromDob(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

const TABS = ['Visits', 'Lab orders', 'Prescriptions', 'Chairs & Rooms', 'Billing'];

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Visits');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.patients.history(id)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return null;

  const { patient, appointments, lab_orders, prescriptions, admissions, invoices } = data;
  const age = ageFromDob(patient.date_of_birth);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">
            <span onClick={() => navigate('/patients')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Patients</span> / History
          </div>
          <h1>{patient.full_name}</h1>
        </div>
        <button className="btn btn-ghost" onClick={() => window.open(`/print/patient-report/${patient.id}`, '_blank')}>
          Print medical report
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 40px' }}>
          <div><div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Patient code</div><div className="mono">{patient.patient_code}</div></div>
          <div><div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Age / Gender</div><div>{age !== null ? `${age}y` : '—'} {patient.gender ? `· ${patient.gender}` : ''}</div></div>
          <div><div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Phone</div><div>{patient.phone || '—'}</div></div>
          <div><div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Blood group</div><div>{patient.blood_group || '—'}</div></div>
          <div><div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Allergies</div><div style={{ color: patient.allergies ? 'var(--red)' : 'inherit' }}>{patient.allergies || 'None recorded'}</div></div>
          <div><div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Chronic conditions</div><div>{patient.chronic_conditions || 'None recorded'}</div></div>
          <div><div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Emergency contact</div><div>{patient.emergency_contact_name ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone || '—'})` : '—'}</div></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="card">
        {tab === 'Visits' && (
          appointments.length === 0 ? <p style={{ color: 'var(--muted)' }}>No visits yet.</p> : (
            <div>
              {appointments.map((a) => (
                <div key={a.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{new Date(a.scheduled_at).toLocaleDateString()} — Dr. {a.doctor_name || 'Unassigned'}</strong>
                    <span className={`badge ${a.status === 'completed' ? 'ok' : a.status === 'cancelled' ? 'busy' : 'wait'}`}>{a.status}</span>
                  </div>
                  {a.reason && <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>Reason: {a.reason}</div>}
                  {a.diagnosis && <div style={{ fontSize: '0.85rem', marginTop: 4 }}><strong>Diagnosis:</strong> {a.diagnosis}</div>}
                  {a.doctor_notes && <div style={{ fontSize: '0.85rem', marginTop: 2 }}><strong>Treatment notes:</strong> {a.doctor_notes}</div>}
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'Lab orders' && (
          lab_orders.length === 0 ? <p style={{ color: 'var(--muted)' }}>No lab orders yet.</p> : (
            <table>
              <thead><tr><th>Test</th><th>Ordered by</th><th>Date</th><th>Status</th><th>Result</th></tr></thead>
              <tbody>
                {lab_orders.map((l) => (
                  <tr key={l.id}>
                    <td>{l.test_name}</td>
                    <td>{l.ordered_by_name}</td>
                    <td>{new Date(l.ordered_at).toLocaleDateString()}</td>
                    <td><span className={`badge ${l.status === 'completed' ? 'ok' : 'wait'}`}>{l.status}</span></td>
                    <td>{l.result_file_url ? <a href={l.result_file_url} target="_blank" rel="noreferrer">{l.file_name || 'View file'}</a> : (l.result_text || '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'Prescriptions' && (
          prescriptions.length === 0 ? <p style={{ color: 'var(--muted)' }}>No prescriptions yet.</p> : (
            <div>
              {prescriptions.map((p) => (
                <div key={p.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{new Date(p.created_at).toLocaleDateString()}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{p.prescribed_by_name}</span>
                  </div>
                  {p.items.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      {item.medicine_name} — {item.dosage} — {item.frequency} {item.duration_days ? `— ${item.duration_days}d` : ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'Chairs & Rooms' && (
          admissions.length === 0 ? <p style={{ color: 'var(--muted)' }}>No chair/room visits recorded.</p> : (
            <table>
              <thead><tr><th>Room / Chair</th><th>Doctor</th><th>Seated</th><th>Finished</th><th>Status</th></tr></thead>
              <tbody>
                {admissions.map((a) => (
                  <tr key={a.id}>
                    <td>{a.room_name} — {a.chair_number}</td>
                    <td>{a.doctor_name || '—'}</td>
                    <td>{new Date(a.admitted_at).toLocaleString()}</td>
                    <td>{a.discharged_at ? new Date(a.discharged_at).toLocaleString() : '—'}</td>
                    <td><span className={`badge ${a.status === 'discharged' ? 'ok' : 'wait'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'Billing' && (
          invoices.length === 0 ? <p style={{ color: 'var(--muted)' }}>No invoices yet.</p> : (
            <table>
              <thead><tr><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="mono">{Number(inv.total_amount).toFixed(2)}</td>
                    <td className="mono">{Number(inv.amount_paid).toFixed(2)}</td>
                    <td className="mono">{(Number(inv.total_amount) - Number(inv.amount_paid)).toFixed(2)}</td>
                    <td><span className={`badge ${inv.status === 'paid' ? 'ok' : inv.status === 'partially_paid' ? 'wait' : 'neutral'}`}>{inv.status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
