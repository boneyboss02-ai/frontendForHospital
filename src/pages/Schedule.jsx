import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import SearchPicker, { makeStaffFetcher } from '../components/SearchPicker';

const staffFetcher = makeStaffFetcher(api);

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMPTY_ENTRY = { staff: null, dayOfWeek: 1, wardId: '', startTime: '08:00', endTime: '16:00', note: '' };

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

  // Recurring weekly plan builder — a separate mode from the one-off form
  // above. Admin picks any date in the target week, builds up a list of
  // (staff, day, time) entries, and saving generates concrete shifts every
  // week through December 31st of that year.
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [weekStart, setWeekStart] = useState(todayStr());
  const [planEntries, setPlanEntries] = useState([{ ...EMPTY_ENTRY }]);
  const [planSaving, setPlanSaving] = useState(false);

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

  function updatePlanEntry(idx, patch) {
    setPlanEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function addPlanEntry() {
    setPlanEntries((prev) => [...prev, { ...EMPTY_ENTRY }]);
  }
  function removePlanEntry(idx) {
    setPlanEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSavePlan(e) {
    e.preventDefault();
    setError('');
    const entries = planEntries
      .filter((en) => en.staff && en.startTime && en.endTime)
      .map((en) => ({
        user_id: en.staff.id,
        ward_id: en.wardId || undefined,
        day_of_week: Number(en.dayOfWeek),
        start_time: en.startTime,
        end_time: en.endTime,
        note: en.note || undefined,
      }));
    if (entries.length === 0) {
      setError('Add at least one staff assignment to the plan.');
      return;
    }
    setPlanSaving(true);
    try {
      const result = await api.shifts.createPattern({ week_start: weekStart, entries });
      setPlanEntries([{ ...EMPTY_ENTRY }]);
      setShowPlanForm(false);
      load();
      alert(`Weekly plan saved — ${result.shifts_created} shifts scheduled through the end of the year.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlanSaving(false);
    }
  }

  // A pattern-generated shift offers two different removals: just today's
  // occurrence (the plan keeps running otherwise), or cancel the recurring
  // assignment from this date onward. window.confirm stands in for a
  // proper "which did you mean" dialog — good enough for an admin-only,
  // infrequent action, without building a new modal component for it.
  async function handleRemoveFromPattern(shift) {
    const cancelFromHere = window.confirm(
      `"${shift.staff_name}" on ${DAY_LABELS[new Date(shift.shift_date).getDay()]} is part of a recurring weekly plan.\n\n` +
      `OK = cancel this and every future occurrence from ${shift.shift_date} onward.\n` +
      `Cancel = only remove this one day; the plan continues as normal after it.`
    );
    setError('');
    try {
      if (cancelFromHere) {
        await api.shifts.removePattern(shift.pattern_id, shift.shift_date);
      } else {
        await api.shifts.remove(shift.id);
      }
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setShowPlanForm((s) => !s); }}>
              {showPlanForm ? 'Cancel' : '+ Set weekly plan'}
            </button>
            <button className="btn btn-primary" onClick={() => { setShowPlanForm(false); setShowForm((s) => !s); }}>
              {showForm ? 'Cancel' : '+ Assign shift'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showPlanForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 4 }}>Set a recurring weekly plan</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 14 }}>
            Build out one week below. Once saved, each assignment repeats on the same day and time
            every week through the end of the year — nothing changes unless you edit or cancel it here.
          </p>
          <form onSubmit={handleSavePlan}>
            <div className="field" style={{ maxWidth: 220, marginBottom: 14 }}>
              <label>Any date in the starting week</label>
              <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
            </div>

            {planEntries.map((en, idx) => (
              <div key={idx} className="form-row" style={{ alignItems: 'flex-end', marginBottom: 6 }}>
                <div style={{ flex: 1.4 }}>
                  <SearchPicker
                    label="Staff"
                    value={en.staff}
                    onSelect={(staff) => updatePlanEntry(idx, { staff })}
                    fetchResults={staffFetcher}
                    placeholder="Search by name…"
                  />
                </div>
                <div className="field" style={{ maxWidth: 110 }}>
                  <label>Day</label>
                  <select value={en.dayOfWeek} onChange={(e) => updatePlanEntry(idx, { dayOfWeek: e.target.value })}>
                    {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="field" style={{ maxWidth: 110 }}>
                  <label>Start</label>
                  <input type="time" value={en.startTime} onChange={(e) => updatePlanEntry(idx, { startTime: e.target.value })} />
                </div>
                <div className="field" style={{ maxWidth: 110 }}>
                  <label>End</label>
                  <input type="time" value={en.endTime} onChange={(e) => updatePlanEntry(idx, { endTime: e.target.value })} />
                </div>
                <div className="field" style={{ maxWidth: 130 }}>
                  <label>Room</label>
                  <select value={en.wardId} onChange={(e) => updatePlanEntry(idx, { wardId: e.target.value })}>
                    <option value="">—</option>
                    {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                {planEntries.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePlanEntry(idx)}>Remove</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addPlanEntry} style={{ marginBottom: 16 }}>
              + Add another assignment
            </button>
            <div>
              <button className="btn btn-primary" disabled={planSaving}>{planSaving ? 'Saving…' : 'Save weekly plan'}</button>
            </div>
          </form>
        </div>
      )}

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
                <label>Room (optional)</label>
                <select value={wardId} onChange={(e) => setWardId(e.target.value)}>
                  <option value="">No specific room</option>
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
              <tr><th>Staff</th><th>Role</th><th>Time</th><th>Room</th><th>Note</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td>{s.staff_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.staff_role}</td>
                  <td className="mono">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</td>
                  <td>{s.ward_name || '—'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {s.pattern_id && <span className="badge neutral" style={{ marginRight: 6 }}>recurring</span>}
                    {s.note || '—'}
                  </td>
                  {isAdmin && (
                    <td>
                      {s.pattern_id ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveFromPattern(s)}>Remove…</button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)}>Remove</button>
                      )}
                    </td>
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
