import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import SearchPicker, { makeDoctorFetcher } from '../components/SearchPicker';
import TimePicker from '../components/TimePicker';

const doctorFetcher = makeDoctorFetcher(api);

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime12h(hhmmss) {
  const [h, m] = hhmmss.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function Availability() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Admin picks which doctor to manage; a doctor always manages themself.
  const [selectedDoctor, setSelectedDoctor] = useState(
    isAdmin ? null : { id: user.id, label: user.full_name }
  );
  const [windows, setWindows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [slotMinutes, setSlotMinutes] = useState('15');

  const doctorId = selectedDoctor?.id;

  async function load() {
    if (!doctorId) return;
    setLoading(true);
    setError('');
    try {
      const { availability } = await api.staff.getAvailability(doctorId);
      setWindows(availability);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [doctorId]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.staff.addAvailability(doctorId, {
        day_of_week: Number(dayOfWeek),
        start_time: startTime,
        end_time: endTime,
        slot_minutes: Number(slotMinutes) || 15,
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.staff.deleteAvailability(doctorId, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Scheduling</div>
          <h1>{isAdmin ? "Doctor's working hours" : 'My working hours'}</h1>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: -10, marginBottom: 20 }}>
        These hours drive the appointment slot picker. Booking outside them isn't blocked —
        reception can still book a walk-in or emergency with a warning — but keeping this
        accurate means the slot picker actually shows the right times to patients and staff.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {isAdmin && (
        <div className="card" style={{ marginBottom: 20 }}>
          <SearchPicker
            label="Doctor"
            value={selectedDoctor}
            onSelect={setSelectedDoctor}
            fetchResults={doctorFetcher}
            placeholder="Search doctor by name…"
          />
        </div>
      )}

      {!doctorId ? (
        <p style={{ color: 'var(--muted)' }}>Select a doctor to manage their hours.</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14 }}>Add a working-hours window</h3>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="field">
                  <label>Day of week</label>
                  <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <TimePicker label="Start time" value={startTime} onChange={setStartTime} />
                <TimePicker label="End time" value={endTime} onChange={setEndTime} />
                <div className="field">
                  <label>Slot length (min)</label>
                  <input type="number" min="5" step="5" value={slotMinutes} onChange={(e) => setSlotMinutes(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary">Add window</button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Current working hours</h3>
            {loading ? (
              <p style={{ color: 'var(--muted)' }}>Loading…</p>
            ) : windows.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>
                No hours set yet — the slot picker will show no open slots for this doctor until you add some.
              </p>
            ) : (
              <table>
                <thead>
                  <tr><th>Day</th><th>Start</th><th>End</th><th>Slot length</th><th></th></tr>
                </thead>
                <tbody>
                  {windows.map((w) => (
                    <tr key={w.id}>
                      <td>{DAYS[w.day_of_week]}</td>
                      <td className="mono">{formatTime12h(w.start_time)}</td>
                      <td className="mono">{formatTime12h(w.end_time)}</td>
                      <td>{w.slot_minutes} min</td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(w.id)}>Remove</button></td>
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
