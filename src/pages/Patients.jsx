import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

const EMPTY_FORM = {
  full_name: '', date_of_birth: '', gender: '', phone: '', address: '',
  blood_group: '', allergies: '', emergency_contact_name: '', emergency_contact_phone: '',
};

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [invitingId, setInvitingId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResult, setInviteResult] = useState(null); // { user, temporary_password }

  async function load(q) {
    setLoading(true);
    try {
      const { patients } = await api.patients.list(q);
      setPatients(patients);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleSearchSubmit(e) {
    e.preventDefault();
    load(search);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.patients.create(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load(search);
    } catch (err) {
      setError(err.message);
    }
  }

  function startInvite(patient) {
    setInvitingId(patient.id);
    setInviteEmail(patient.email || '');
    setInviteResult(null);
    setError('');
  }

  async function handleInvite(e) {
    e.preventDefault();
    setError('');
    try {
      const result = await api.patients.invite(invitingId, { email: inviteEmail });
      setInviteResult(result);
      load(search);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Records</div>
          <h1>Patients</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Register patient'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>New patient</h3>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="field">
                <label>Full name</label>
                <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Date of birth</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>
              <div className="field">
                <label>Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="field">
                <label>Blood group</label>
                <input placeholder="e.g. O+" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="field">
              <label>Allergies</label>
              <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Emergency contact name</label>
                <input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Emergency contact phone</label>
                <input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary">Save patient</button>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="Search by name, patient code, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-ghost">Search</button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : patients.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No patients found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Blood group</th>
                <th>Portal</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <React.Fragment key={p.id}>
                  <tr>
                    <td className="mono">{p.patient_code}</td>
                    <td>{p.full_name}</td>
                    <td>{p.gender || '—'}</td>
                    <td>{p.phone || '—'}</td>
                    <td>{p.blood_group || '—'}</td>
                    <td>
                      {p.user_id ? (
                        <span className="badge ok">Active</span>
                      ) : invitingId === p.id ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => setInvitingId(null)}>Cancel</button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => startInvite(p)}>Invite</button>
                      )}
                    </td>
                  </tr>
                  {invitingId === p.id && (
                    <tr>
                      <td colSpan={6} style={{ background: '#FBFAF7' }}>
                        {inviteResult ? (
                          <div style={{ padding: '14px 4px' }}>
                            <p style={{ marginTop: 0, fontSize: '0.85rem' }}>
                              Portal account created. Share this temporary password with {p.full_name} now — it will not be shown again:
                            </p>
                            <p className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '8px 12px', display: 'inline-block' }}>
                              {inviteResult.temporary_password}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                              They'll be asked to set their own password on first login.
                            </p>
                            <button className="btn btn-ghost btn-sm" onClick={() => setInvitingId(null)}>Done</button>
                          </div>
                        ) : (
                          <form onSubmit={handleInvite} style={{ padding: '14px 4px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                            <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                              <label>Patient's email (for their portal login)</label>
                              <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                            </div>
                            <button className="btn btn-primary btn-sm">Create portal account</button>
                          </form>
                        )}
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
