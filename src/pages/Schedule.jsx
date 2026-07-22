import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import SearchPicker, { makeStaffFetcher } from '../components/SearchPicker';

const staffFetcher = makeStaffFetcher(api);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Schedule() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [date, setDate] = useState(todayStr());
  const [shifts, setShifts] = useState([]);
  const [wards, setWards] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [staffMember, setStaffMember] = useState(null);
  const [wardId, setWardId] = useState('');
  const [shiftDate, setShiftDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [note, setNote] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [shiftsRes, wardsRes] = await Promise.all([
        api.shifts.list({ date }),
        api.inpatient.wards(),
      ]);
      setShifts(shiftsRes.shifts);
      setWards(wardsRes.wards);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [date]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!staffMember) {
      setError('Select a staff member.');
      return;
    }
    try {
      await api.shifts.create({
        user_id: staffMember.id,
        ward_id: wardId || undefined,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        note: note || undefined,
      });
      setStaffMember(null);
      setWardId('');
      setNote('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.shifts.remove(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Staffing</div>
          <h1>Who's on duty</h1>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Assign shift'}
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>Assign a shift</h3>
          <form onSubmit={handleAdd}>
            <SearchPicker
              label="Staff member"
              required
              value={staffMember}
              onSelect={setStaffMember}
              fetchResults={staffFetcher}
              placeholder="Search by name…"
            />
            <div className="form-row">
              <div className="field">
                <label>Date</label>
                <input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Start time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="field">
                <label>End time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Ward (optional)</label>
                <select value={wardId} onChange={(e) => setWardId(e.target.value)}>
                  <option value="">No specific ward</option>
                  {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Note (optional)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. covering for Dr. X" />
              </div>
            </div>
            <button className="btn btn-primary">Assign shift</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="field" style={{ maxWidth: 220, marginBottom: 16 }}>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : shifts.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No shifts assigned for this date.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Staff</th><th>Role</th><th>Time</th><th>Ward</th><th>Note</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td>{s.staff_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.staff_role}</td>
                  <td className="mono">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</td>
                  <td>{s.ward_name || '—'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{s.note || '—'}</td>
                  {isAdmin && (
                    <td><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)}>Remove</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
