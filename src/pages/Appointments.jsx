import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import SearchPicker, { makePatientFetcher, makeDoctorFetcher } from '../components/SearchPicker';
import SlotPicker from '../components/SlotPicker';

const STATUS_BADGE = {
  scheduled: 'neutral',
  checked_in: 'wait',
  in_progress: 'wait',
  completed: 'ok',
  cancelled: 'busy',
  no_show: 'busy',
};

const patientFetcher = makePatientFetcher(api);
const doctorFetcher = makeDoctorFetcher(api);

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');

  const [completingId, setCompletingId] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  async function load() {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { appointments } = await api.appointments.list({ date: today });
      setAppointments(appointments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleBook(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!patient || !doctor) {
      setError('Please select a patient and a doctor.');
      return;
    }
    try {
      const { warning } = await api.appointments.create({
        patient_id: patient.id,
        doctor_id: doctor.id,
        scheduled_at: scheduledAt,
        reason,
      });
      setPatient(null);
      setDoctor(null);
      setScheduledAt('');
      setReason('');
      setShowForm(false);
      if (warning) setNotice(`Booked — ${warning}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.appointments.updateStatus(id, status);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startCompleting(id) {
    setCompletingId(id);
    setDiagnosis('');
    setDoctorNotes('');
  }

  async function handleCompleteConsultation(e) {
    e.preventDefault();
    setError('');
    try {
      await api.appointments.addConsultation(completingId, {
        diagnosis,
        doctor_notes: doctorNotes,
      });
      setCompletingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Today's queue</div>
          <h1>Appointments</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Book appointment'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="notice-banner">{notice}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Book appointment</h3>
          <form onSubmit={handleBook}>
            <div className="form-row">
              <SearchPicker label="Patient" required value={patient} onSelect={setPatient} fetchResults={patientFetcher} placeholder="Search patient by name or code…" />
              <SearchPicker label="Doctor" required value={doctor} onSelect={(d) => { setDoctor(d); setScheduledAt(''); }} fetchResults={doctorFetcher} placeholder="Search doctor by name…" />
            </div>
            <div className="field">
              <label>Appointment time</label>
              <SlotPicker doctorId={doctor?.id} value={scheduledAt} onSelect={setScheduledAt} allowCustomTime />
              {scheduledAt && (
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 6 }}>
                  Selected: {new Date(scheduledAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="field">
              <label>Reason for visit</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <button className="btn btn-primary" disabled={!scheduledAt}>Book</button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : appointments.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No appointments scheduled for today.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <React.Fragment key={a.id}>
                  <tr>
                    <td className="mono">#{a.token_number}</td>
                    <td>{new Date(a.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{a.patient_name} <span style={{ color: 'var(--muted)' }} className="mono">({a.patient_code})</span></td>
                    <td>{a.doctor_name}</td>
                    <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status.replace('_', ' ')}</span></td>
                    <td>
                      {a.status === 'scheduled' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(a.id, 'checked_in')}>Check in</button>
                      )}
                      {a.status === 'checked_in' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(a.id, 'in_progress')}>Start visit</button>
                      )}
                      {a.status === 'in_progress' && (
                        <button className="btn btn-primary btn-sm" onClick={() => startCompleting(a.id)}>Complete visit</button>
                      )}
                    </td>
                  </tr>
                  {completingId === a.id && (
                    <tr>
                      <td colSpan={6} style={{ background: '#FBFAF7' }}>
                        <form onSubmit={handleCompleteConsultation} style={{ padding: '14px 4px' }}>
                          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 0, marginBottom: 10 }}>
                            Completing this visit will bill the consultation fee to the patient's invoice automatically (if one is set for this doctor).
                          </p>
                          <div className="form-row">
                            <div className="field">
                              <label>Diagnosis</label>
                              <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                            </div>
                            <div className="field">
                              <label>Notes</label>
                              <input value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm">Save &amp; complete</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompletingId(null)}>Cancel</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
