import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import SearchPicker, { makeDoctorFetcher } from '../../components/SearchPicker';
import SlotPicker from '../../components/SlotPicker';

const doctorFetcher = makeDoctorFetcher(api);

const STATUS_BADGE = {
  scheduled: 'wait', checked_in: 'wait', in_progress: 'wait',
  completed: 'ok', cancelled: 'neutral', no_show: 'busy',
};

export default function PortalAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [doctor, setDoctor] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { appointments } = await api.portal.appointments();
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
    if (!doctor || !scheduledAt) {
      setError('Please choose a doctor and a time.');
      return;
    }
    setBooking(true);
    try {
      await api.portal.bookAppointment({ doctor_id: doctor.id, scheduled_at: scheduledAt, reason });
      setDoctor(null);
      setScheduledAt('');
      setReason('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this appointment?')) return;
    setError('');
    try {
      await api.portal.cancelAppointment(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Patient portal</div>
          <h1>Appointments</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Book appointment'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Book a new appointment</h3>
          <form onSubmit={handleBook}>
            <SearchPicker
              label="Doctor"
              required
              value={doctor}
              onSelect={(d) => { setDoctor(d); setScheduledAt(''); }}
              fetchResults={doctorFetcher}
              placeholder="Search doctor by name or specialty…"
            />
            <div className="field">
              <label>Appointment time</label>
              <SlotPicker doctorId={doctor?.id} value={scheduledAt} onSelect={setScheduledAt} />
              {scheduledAt && (
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 6 }}>
                  Selected: {new Date(scheduledAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="field">
              <label>Reason for visit</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
            </div>
            <button className="btn btn-primary" disabled={!scheduledAt || booking}>
              {booking ? 'Booking…' : 'Confirm booking'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : appointments.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No appointments yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Doctor</th><th>Date &amp; time</th><th>Token</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.doctor_name}<div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{a.specialty}</div></td>
                  <td>{new Date(a.scheduled_at).toLocaleString()}</td>
                  <td className="mono">#{a.token_number}</td>
                  <td><span className={`badge ${STATUS_BADGE[a.status] || 'neutral'}`}>{a.status.replace('_', ' ')}</span></td>
                  <td>
                    {a.status === 'scheduled' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(a.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
