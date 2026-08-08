import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import SearchPicker, { makePatientFetcher, makeDoctorFetcher, makeInventoryFetcher } from '../components/SearchPicker';
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
const inventoryFetcher = makeInventoryFetcher(api);

export default function Appointments() {
  const { user } = useAuth();
  const canChargeCard = user?.role === 'receptionist';
  const isAdmin = user?.role === 'admin'; // view + filter only — booking and day-to-day queue actions are reception/clinical work

  const todayISO = new Date().toISOString().slice(0, 10);

  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Filters — date defaults to today (the old fixed behavior), but all of
  // these are optional and compose together via the same query params the
  // backend already supported.
  const [filterDate, setFilterDate] = useState(todayISO);
  const [filterDoctor, setFilterDoctor] = useState(null);
  const [filterPatient, setFilterPatient] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');

  const [completingId, setCompletingId] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [charges, setCharges] = useState([]); // [{description, amount}]
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [itemsUsed, setItemsUsed] = useState([]); // [{item: {id,label}, quantity}]
  const [usageItem, setUsageItem] = useState(null);
  const [usageQty, setUsageQty] = useState('1');

  const [cardChargeId, setCardChargeId] = useState(null);
  const [cardAmount, setCardAmount] = useState('200');

  // Fetched once — the treatment picker in the "Complete visit" form reads
  // from this rather than hitting the network on every click.
  const [treatments, setTreatments] = useState([]);

  useEffect(() => {
    if (user?.role === 'doctor') {
      api.treatments.list().then((d) => setTreatments(d.treatments)).catch(() => {});
    }
  }, [user?.role]);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterDoctor) params.doctor_id = filterDoctor.id;
      if (filterPatient) params.patient_id = filterPatient.id;
      if (filterStatus) params.status = filterStatus;
      const { appointments } = await api.appointments.list(params);
      setAppointments(appointments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterDate, filterDoctor, filterPatient, filterStatus]);

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

  async function handleCancel(appointment) {
    if (!window.confirm(`Cancel appointment #${appointment.token_number} for ${appointment.patient_name}?`)) return;
    await updateStatus(appointment.id, 'cancelled');
  }

  function startCompleting(id) {
    setCompletingId(id);
    setDiagnosis('');
    setDoctorNotes('');
    setCharges([]);
    setChargeDesc('');
    setChargeAmount('');
    setItemsUsed([]);
    setUsageItem(null);
    setUsageQty('1');
  }

  function addCharge() {
    const amount = Number(chargeAmount);
    if (!chargeDesc.trim() || !amount || amount <= 0) return;
    setCharges((c) => [...c, { description: chargeDesc.trim(), amount }]);
    setChargeDesc('');
    setChargeAmount('');
  }
  function removeCharge(idx) {
    setCharges((c) => c.filter((_, i) => i !== idx));
  }

  function addItemUsed() {
    const qty = Number(usageQty);
    if (!usageItem || !qty || qty <= 0) return;
    setItemsUsed((items) => [...items, { item: usageItem, quantity: qty }]);
    setUsageItem(null);
    setUsageQty('1');
  }
  function removeItemUsed(idx) {
    setItemsUsed((items) => items.filter((_, i) => i !== idx));
  }

  // The whole point of the treatment picker: one click adds the charge
  // (at the catalog price) AND the inventory it consumes (from the
  // treatment's recipe) — instead of the doctor typing both by hand and
  // reception having to trust they remembered the right price. Both lists
  // stay editable afterward via the normal Remove buttons, so a doctor can
  // still correct a quantity or drop something for an unusual case.
  function applyTreatment(t) {
    setCharges((c) => [...c, { description: t.name, amount: Number(t.price) }]);
    if (t.items.length > 0) {
      setItemsUsed((items) => {
        const next = [...items];
        for (const ti of t.items) {
          const existingIdx = next.findIndex((u) => u.item.id === ti.item_id);
          if (existingIdx >= 0) {
            next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + Number(ti.quantity) };
          } else {
            next.push({ item: { id: ti.item_id, label: ti.item_name }, quantity: Number(ti.quantity) });
          }
        }
        return next;
      });
    }
  }

  async function handleCompleteConsultation(e) {
    e.preventDefault();
    setError('');
    try {
      await api.appointments.addConsultation(completingId, {
        diagnosis,
        doctor_notes: doctorNotes,
        charges: charges.map((c) => ({ description: c.description, amount: c.amount })),
        items_used: itemsUsed.map((u) => ({ item_id: u.item.id, quantity: u.quantity })),
      });
      setCompletingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleChargeCard(appointmentId, patientId) {
    setError('');
    const amount = Number(cardAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid card fee amount.');
      return;
    }
    try {
      await api.billing.createInvoice({
        patient_id: patientId,
        appointment_id: appointmentId,
        items: [{ description: 'Registration / Card fee', quantity: 1, unit_price: amount }],
      });
      setCardChargeId(null);
      setNotice('Card fee charged — patient can pay at Billing.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{filterDate === todayISO ? "Today's queue" : filterDate ? new Date(filterDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'All appointments'}</div>
          <h1>Appointments</h1>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Book appointment'}
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="notice-banner">{notice}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ maxWidth: 170 }}>
            <label>Date</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          {user?.role !== 'doctor' && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <SearchPicker label="Doctor" value={filterDoctor} onSelect={setFilterDoctor} fetchResults={doctorFetcher} placeholder="Any doctor…" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <SearchPicker label="Patient" value={filterPatient} onSelect={setFilterPatient} fetchResults={patientFetcher} placeholder="Any patient…" />
          </div>
          <div className="field" style={{ maxWidth: 170 }}>
            <label>Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Any status</option>
              <option value="scheduled">Scheduled</option>
              <option value="checked_in">Checked in</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-show</option>
            </select>
          </div>
          {(filterDate !== todayISO || filterDoctor || filterPatient || filterStatus) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterDate(todayISO); setFilterDoctor(null); setFilterPatient(null); setFilterStatus(''); }}
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

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
              <input placeholder="e.g. Toothache, routine cleaning, whitening consult" value={reason} onChange={(e) => setReason(e.target.value)} />
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
                    <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {!isAdmin && (
                        <>
                          {canChargeCard && a.status !== 'cancelled' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setCardChargeId(cardChargeId === a.id ? null : a.id)}>
                              Charge card
                            </button>
                          )}
                          {a.status === 'scheduled' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(a.id, 'checked_in')}>Check in</button>
                          )}
                          {a.status === 'checked_in' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(a.id, 'in_progress')}>Start visit</button>
                          )}
                          {a.status === 'in_progress' && (
                            <button className="btn btn-primary btn-sm" onClick={() => startCompleting(a.id)}>Complete visit</button>
                          )}
                          {['scheduled', 'checked_in', 'in_progress'].includes(a.status) && (() => {
                            // Receptionists only get to cancel appointments they
                            // personally booked — a colleague's booking is not
                            // theirs to cancel. Other staff roles aren't limited
                            // by this (matches the backend check in appointments.js).
                            const canCancel = user?.role !== 'receptionist' || a.created_by === user?.id;
                            return (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: canCancel ? 'var(--red)' : undefined, opacity: canCancel ? 1 : 0.4, cursor: canCancel ? 'pointer' : 'not-allowed' }}
                                disabled={!canCancel}
                                title={canCancel ? undefined : 'Only the receptionist who booked this can cancel it'}
                                onClick={() => handleCancel(a)}
                              >
                                Cancel
                              </button>
                            );
                          })()}
                        </>
                      )}
                    </td>
                  </tr>

                  {cardChargeId === a.id && (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--sky-100)' }}>
                        <div style={{ padding: '14px 4px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                          <div className="field" style={{ maxWidth: 160 }}>
                            <label>Card fee amount</label>
                            <input type="number" value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} />
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={() => handleChargeCard(a.id, a.patient_id)}>Charge</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setCardChargeId(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {completingId === a.id && (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--sky-100)' }}>
                        <form onSubmit={handleCompleteConsultation} style={{ padding: '14px 4px' }}>
                          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 0, marginBottom: 10 }}>
                            Add what was done and its charge, and anything used from inventory — both are optional, but this is the only place to bill a procedure or log inventory use for this visit.
                          </p>
                          <div className="form-row">
                            <div className="field">
                              <label>Diagnosis</label>
                              <input placeholder="e.g. Dental caries — tooth #14" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                            </div>
                            <div className="field">
                              <label>Treatment notes</label>
                              <input placeholder="e.g. Composite filling placed, patient tolerated well" value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} />
                            </div>
                          </div>

                          {treatments.length > 0 && (
                            <div style={{ marginTop: 14, marginBottom: 4 }}>
                              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Treatments — click to bill and log inventory automatically
                              </label>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {treatments.map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => applyTreatment(t)}
                                    title={t.items.length > 0 ? `Uses: ${t.items.map((i) => `${i.quantity} ${i.item_name}`).join(', ')}` : undefined}
                                  >
                                    {t.name} · {Number(t.price).toFixed(0)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ marginTop: 14, marginBottom: 14 }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Charges</label>
                            {charges.map((c, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.85rem', marginBottom: 4 }}>
                                <span style={{ flex: 1 }}>{c.description}</span>
                                <span className="mono">{c.amount}</span>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeCharge(idx)}>Remove</button>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 10 }}>
                              <input placeholder="e.g. Tooth extraction" value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} style={{ flex: 2 }} />
                              <input type="number" placeholder="Amount" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} style={{ flex: 1 }} />
                              <button type="button" className="btn btn-ghost btn-sm" onClick={addCharge}>+ Add charge</button>
                            </div>
                          </div>

                          <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Items used (from inventory)</label>
                            {itemsUsed.map((u, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.85rem', marginBottom: 4 }}>
                                <span style={{ flex: 1 }}>{u.item.label}</span>
                                <span className="mono">x{u.quantity}</span>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItemUsed(idx)}>Remove</button>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                              <div style={{ flex: 2 }}>
                                <SearchPicker value={usageItem} onSelect={setUsageItem} fetchResults={inventoryFetcher} placeholder="Search medicine or supply…" />
                              </div>
                              <input type="number" min="1" value={usageQty} onChange={(e) => setUsageQty(e.target.value)} style={{ flex: 1 }} />
                              <button type="button" className="btn btn-ghost btn-sm" onClick={addItemUsed}>+ Add item</button>
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
