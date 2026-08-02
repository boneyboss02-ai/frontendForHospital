import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

export default function PrintPatientReport() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.patients.history(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="print-page"><div className="error-banner">{error}</div></div>;
  if (!data) return <div className="print-page">Loading…</div>;

  const { patient, appointments, lab_orders, prescriptions, admissions } = data;
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="print-page">
      <div className="print-actions">
        <button className="btn btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="print-header">
        <div>
          <div className="print-brand">Yoma<span style={{ color: 'var(--amber)' }}>.</span></div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Yoma Dental Clinic — Medical Report</div>
        </div>
        <div className="print-meta">
          <div>Generated {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <div className="print-section">
        <h3>Patient</h3>
        <div>{patient.full_name} <span className="mono" style={{ color: 'var(--muted)' }}>({patient.patient_code})</span></div>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>
          {age !== null ? `${age} years old` : ''} {patient.gender ? `· ${patient.gender}` : ''} {patient.phone ? `· ${patient.phone}` : ''}
        </div>
      </div>

      <div className="print-section">
        <h3>Medical background</h3>
        <div style={{ fontSize: '0.85rem' }}>
          <div><strong>Blood group:</strong> {patient.blood_group || 'Not recorded'}</div>
          <div style={{ marginTop: 4 }}><strong>Allergies:</strong> {patient.allergies || 'None recorded'}</div>
          <div style={{ marginTop: 4 }}><strong>Chronic conditions:</strong> {patient.chronic_conditions || 'None recorded'}</div>
        </div>
      </div>

      <div className="print-section">
        <h3>Visit history</h3>
        {appointments.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>No visits on record.</p> : (
          <table className="print-table">
            <thead><tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Treatment notes</th></tr></thead>
            <tbody>
              {appointments.filter((a) => a.status === 'completed').map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.scheduled_at).toLocaleDateString()}</td>
                  <td>{a.doctor_name || '—'}</td>
                  <td>{a.diagnosis || '—'}</td>
                  <td>{a.doctor_notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {lab_orders.length > 0 && (
        <div className="print-section">
          <h3>Lab results</h3>
          <table className="print-table">
            <thead><tr><th>Test</th><th>Date</th><th>Result</th></tr></thead>
            <tbody>
              {lab_orders.map((l) => (
                <tr key={l.id}>
                  <td>{l.test_name}</td>
                  <td>{new Date(l.ordered_at).toLocaleDateString()}</td>
                  <td>{l.result_text || (l.result_file_url ? l.file_name : 'Pending')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {prescriptions.length > 0 && (
        <div className="print-section">
          <h3>Prescriptions</h3>
          <table className="print-table">
            <thead><tr><th>Date</th><th>Medicine</th><th>Dosage</th><th>Frequency</th></tr></thead>
            <tbody>
              {prescriptions.map((p) => (
                p.items.map((item, idx) => (
                  <tr key={`${p.id}-${idx}`}>
                    <td>{idx === 0 ? new Date(p.created_at).toLocaleDateString() : ''}</td>
                    <td>{item.medicine_name}</td>
                    <td>{item.dosage}</td>
                    <td>{item.frequency}</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      )}

      {admissions.length > 0 && (
        <div className="print-section">
          <h3>Chair / room visits</h3>
          <table className="print-table">
            <thead><tr><th>Room / Chair</th><th>Date</th><th>Reason</th><th>Notes</th></tr></thead>
            <tbody>
              {admissions.map((a) => (
                <tr key={a.id}>
                  <td>{a.room_name} — {a.chair_number}</td>
                  <td>{new Date(a.admitted_at).toLocaleDateString()}</td>
                  <td>{a.admission_reason || '—'}</td>
                  <td>{a.discharge_summary || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 30 }}>
        Generated by Yoma on {new Date().toLocaleString()}. This report reflects records on file at the time of generation.
      </p>
    </div>
  );
}
