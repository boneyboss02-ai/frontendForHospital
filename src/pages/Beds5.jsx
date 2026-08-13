import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import SearchPicker, { makePatientFetcher } from '../components/SearchPicker';

const patientFetcher = makePatientFetcher(api);

// Despite the "Chairs & Rooms" hospital-y naming under the hood (wards/beds/
// admissions in the database), this is really just a waiting-area board:
// which chair is a checked-in patient sitting in until it's their turn.
// No doctor, no reason, no discharge summary — those live on the
// appointment itself. Seating/freeing a chair is open to admin, nurse, and
// receptionist, since reception is who actually runs the waiting area.
export default function Beds() {
  const { user } = useAuth();
  const canManageBeds = user?.role === 'admin' || user?.role === 'nurse' || user?.role === 'receptionist';
  const isAdmin = user?.role === 'admin';
  const [beds, setBeds] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showSeatForm, setShowSeatForm] = useState(false);
  const [seatPatient, setSeatPatient] = useState(null);
  const [seatBedId, setSeatBedId] = useState('');

  const [showManageForm, setShowManageForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('');
  const [newChairRoomId, setNewChairRoomId] = useState('');
  const [newChairNumber, setNewChairNumber] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [bedsRes, admissionsRes, roomsRes] = await Promise.all([
        api.inpatient.beds(),
        api.inpatient.admissions({ status: 'admitted' }),
        api.inpatient.wards(),
      ]);
      setBeds(bedsRes.beds);
      setAdmissions(admissionsRes.admissions);
      setRooms(roomsRes.wards);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleFreeChair(admissionId) {
    if (!window.confirm('Free this chair? The patient has moved on.')) return;
    try {
      await api.inpatient.discharge(admissionId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMarkAvailable(bed) {
    const verb = bed.status === 'cleaning' ? 'Mark this chair as clean and available again?' : 'Mark this chair as available again (maintenance complete)?';
    if (!window.confirm(verb)) return;
    try {
      await api.inpatient.updateBedStatus(bed.id, 'available');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSeat(e) {
    e.preventDefault();
    setError('');
    if (!seatPatient || !seatBedId) {
      setError('Please select a patient and a chair.');
      return;
    }
    try {
      await api.inpatient.admit({
        patient_id: seatPatient.id,
        bed_id: Number(seatBedId),
      });
      setSeatPatient(null);
      setSeatBedId('');
      setShowSeatForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    setError('');
    if (!newRoomName.trim()) {
      setError('Room name is required.');
      return;
    }
    try {
      await api.inpatient.createWard({ name: newRoomName.trim(), floor: newRoomFloor || undefined });
      setNewRoomName('');
      setNewRoomFloor('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateChair(e) {
    e.preventDefault();
    setError('');
    if (!newChairRoomId || !newChairNumber.trim()) {
      setError('Please pick a room and enter a chair number.');
      return;
    }
    try {
      await api.inpatient.createBed({ ward_id: Number(newChairRoomId), bed_number: newChairNumber.trim() });
      setNewChairNumber('');
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
          <div className="eyebrow">Waiting area</div>
          <h1>Chairs &amp; Rooms</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button className="btn btn-ghost" onClick={() => setShowManageForm((s) => !s)}>
              {showManageForm ? 'Cancel' : '+ Add room / chair'}
            </button>
          )}
          {canManageBeds && (
            <button className="btn btn-primary" onClick={() => setShowSeatForm((s) => !s)}>
              {showSeatForm ? 'Cancel' : '+ Seat patient'}
            </button>
          )}
        </div>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: -14, marginBottom: 20 }}>
        A chair is just a place a checked-in patient sits until it's their turn — seat them here while
        they wait, then free the chair once they move on. No treatment details needed; that all lives
        on the appointment itself.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {isAdmin && showManageForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Add a room or chair</h3>
          <div className="form-row">
            <form onSubmit={handleCreateRoom} style={{ flex: 1 }}>
              <div className="field">
                <label>New room name *</label>
                <input placeholder="e.g. Operatory 1, Consult Room A" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
              </div>
              <div className="field">
                <label>Floor (optional)</label>
                <input placeholder="e.g. Ground Floor" value={newRoomFloor} onChange={(e) => setNewRoomFloor(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Add room</button>
            </form>
            <form onSubmit={handleCreateChair} style={{ flex: 1 }}>
              <div className="field">
                <label>Room *</label>
                <select required value={newChairRoomId} onChange={(e) => setNewChairRoomId(e.target.value)}>
                  <option value="">Select a room</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Chair number *</label>
                <input placeholder="e.g. 1, 2, 3" value={newChairNumber} onChange={(e) => setNewChairNumber(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Add chair</button>
            </form>
          </div>
          {rooms.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 10 }}>
              Add a room first — chairs need a room to belong to.
            </p>
          )}
        </div>
      )}

      {canManageBeds && showSeatForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Seat patient</h3>
          <form onSubmit={handleSeat}>
            <div className="form-row">
              <SearchPicker label="Patient" required value={seatPatient} onSelect={setSeatPatient} fetchResults={patientFetcher} placeholder="Search patient by name or code…" />
              <div className="field">
                <label>Chair *</label>
                <select required value={seatBedId} onChange={(e) => setSeatBedId(e.target.value)}>
                  <option value="">Select an available chair</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>{b.ward_name} — {b.bed_number}</option>
                  ))}
                </select>
                {availableBeds.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--red)', marginTop: 4 }}>No chairs currently available.</p>
                )}
              </div>
            </div>
            <button className="btn btn-primary">Seat patient</button>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 14 }}>Chair map</h3>
            {Object.keys(wardGroups).length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No rooms configured yet.</p>
            ) : (
              <div className="ward-map">
                {Object.entries(wardGroups).map(([wardName, wardBeds]) => (
                  <div className="ward-block" key={wardName}>
                    <h3>{wardName}</h3>
                    <div className="bed-grid">
                      {wardBeds.map((bed) => {
                        const freeable = canManageBeds && (bed.status === 'cleaning' || bed.status === 'maintenance');
                        return (
                          <div
                            key={bed.id}
                            className={`bed-tile ${bed.status}`}
                            title={freeable ? `${bed.status} — click to mark available` : bed.status}
                            onClick={freeable ? () => handleMarkAvailable(bed) : undefined}
                            style={freeable ? { cursor: 'pointer' } : undefined}
                          >
                            {bed.bed_number}
                          </div>
                        );
                      })}
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
            {canManageBeds && (
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 8 }}>
                Click a cleaning or maintenance chair to mark it available again.
              </p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Currently seated</h3>
            {admissions.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No patients currently seated.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Room / Chair</th>
                    <th>Seated since</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((a) => (
                    <tr key={a.id}>
                      <td>{a.patient_name} <span className="mono" style={{ color: 'var(--muted)' }}>({a.patient_code})</span></td>
                      <td>{a.ward_name} / {a.bed_number}</td>
                      <td>{new Date(a.admitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        {canManageBeds && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleFreeChair(a.id)}>Free chair</button>
                        )}
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
