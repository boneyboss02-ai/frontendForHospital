import { useEffect, useState } from 'react';
import { api } from '../api/client';

// Given a doctor, lets the user pick a date then shows the actual open
// slots (derived from doctor_availability minus bookings) as buttons.
// Calls onSelect(isoString) when a slot is chosen.
//
// `allowCustomTime` (staff booking only — not the patient portal) adds a
// fallback for walk-ins/emergencies or when no availability is configured
// yet: a free-text date/time field. The backend only hard-blocks an exact
// double-booking; booking outside the doctor's usual hours is allowed and
// comes back with a warning instead of an error, so this is a legitimate
// path, not a way to bypass a real safety check.
export default function SlotPicker({ doctorId, value, onSelect, allowCustomTime = false }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    setLoading(true);
    setError('');
    api.appointments.availability(doctorId, date)
      .then((data) => setSlots(data.slots))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [doctorId, date]);

  if (!doctorId) {
    return <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Select a doctor first to see available times.</div>;
  }

  if (customMode) {
    return (
      <div>
        <input
          type="datetime-local"
          value={customValue}
          onChange={(e) => { setCustomValue(e.target.value); onSelect(e.target.value ? new Date(e.target.value).toISOString() : ''); }}
        />
        <p style={{ fontSize: '0.78rem', color: 'var(--amber)', marginTop: 6 }}>
          Booking outside the doctor's usual hours is allowed but will show a warning — use this for walk-ins or emergencies.
        </p>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => { setCustomMode(false); setCustomValue(''); onSelect(''); }}>
          Back to available slots
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="field">
        <label>Date</label>
        <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Checking availability…</p>
      ) : slots.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          No open slots this day{allowCustomTime ? '' : ' — try another date, or contact the clinic directly'}.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {slots.map((slot) => (
            <button
              type="button"
              key={slot}
              className={slot === value ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              onClick={() => onSelect(slot)}
            >
              {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </button>
          ))}
        </div>
      )}

      {allowCustomTime && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setCustomMode(true)}>
          Doctor not available when you need? Enter a custom time
        </button>
      )}
    </div>
  );
}
