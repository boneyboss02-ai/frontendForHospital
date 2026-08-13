import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';

const ROLE_LABELS = { admin: 'Admin', doctor: 'Doctor', nurse: 'Nurse', receptionist: 'Receptionist' };

export default function Branches() {
  const { user } = useAuth();
  // A general admin has no branch_id at all. A branch admin has one, and
  // everything here narrows accordingly — see the backend comments in
  // routes/branches.js and routes/staff.js for the full reasoning.
  const isGeneralAdmin = user?.branch_id === null || user?.branch_id === undefined;

  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({
    full_name: '', email: '', phone: '', role: 'doctor', branch_id: '',
    specialty: '', department: '', consultation_fee: '',
  });
  const [newAccountResult, setNewAccountResult] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [branchesData, staffData] = await Promise.all([
        api.branches.list(),
        api.staffDirectory.list(),
      ]);
      setBranches(branchesData.branches);
      setStaff(staffData.staff);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEditBranch(b) {
    setShowBranchForm(true);
    setEditingBranchId(b.id);
    setBranchForm({ name: b.name, address: b.address || '', phone: b.phone || '' });
  }
  function startNewBranch() {
    setShowBranchForm(true);
    setEditingBranchId(null);
    setBranchForm({ name: '', address: '', phone: '' });
  }

  async function handleSaveBranch(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingBranchId) {
        await api.branches.update(editingBranchId, branchForm);
      } else {
        await api.branches.create(branchForm);
      }
      setShowBranchForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateStaff(e) {
    e.preventDefault();
    setError('');
    setNewAccountResult(null);
    try {
      const payload = { ...staffForm };
      if (!isGeneralAdmin) delete payload.branch_id; // backend forces it anyway; just tidy
      if (payload.role !== 'doctor') {
        delete payload.specialty;
        delete payload.department;
        delete payload.consultation_fee;
      } else if (payload.consultation_fee) {
        payload.consultation_fee = Number(payload.consultation_fee);
      }
      const result = await api.staffDirectory.create(payload);
      setNewAccountResult(result);
      setStaffForm({ full_name: '', email: '', phone: '', role: 'doctor', branch_id: '', specialty: '', department: '', consultation_fee: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReassign(staffMember, branchId) {
    setError('');
    try {
      await api.staffDirectory.reassignBranch(staffMember.id, branchId || null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Organization</div>
          <h1>Branches</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3>Locations</h3>
          {isGeneralAdmin && (
            <button className="btn btn-ghost btn-sm" onClick={showBranchForm ? () => setShowBranchForm(false) : startNewBranch}>
              {showBranchForm ? 'Cancel' : '+ New branch'}
            </button>
          )}
        </div>

        {showBranchForm && (
          <form onSubmit={handleSaveBranch} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
            <div className="form-row">
              <div className="field">
                <label>Name</label>
                <input required value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Address</label>
              <input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-sm">{editingBranchId ? 'Save changes' : 'Create branch'}</button>
          </form>
        )}

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>Staff</th>{isGeneralAdmin && <th></th>}</tr></thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.phone || '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{b.address || '—'}</td>
                  <td className="mono">{b.staff_count}</td>
                  {isGeneralAdmin && (
                    <td><button className="btn btn-ghost btn-sm" onClick={() => startEditBranch(b)}>Edit</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3>Staff{!isGeneralAdmin ? ' — your branch' : ''}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowStaffForm((s) => !s); setNewAccountResult(null); }}>
            {showStaffForm ? 'Cancel' : '+ New staff account'}
          </button>
        </div>

        {newAccountResult && (
          <div className="notice-banner" style={{ marginBottom: 16 }}>
            Account created for {newAccountResult.user.full_name}. Temporary password:{' '}
            <strong className="mono">{newAccountResult.temporary_password}</strong> — {newAccountResult.note}
          </div>
        )}

        {showStaffForm && (
          <form onSubmit={handleCreateStaff} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
            <div className="form-row">
              <div className="field">
                <label>Full name</label>
                <input required value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Email</label>
                <input required type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Phone</label>
                <input value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
              </div>
              <div className="field">
                <label>Role</label>
                <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  {isGeneralAdmin && <option value="admin">Admin</option>}
                </select>
              </div>
              {isGeneralAdmin && staffForm.role !== 'admin' && (
                <div className="field">
                  <label>Branch</label>
                  <select required value={staffForm.branch_id} onChange={(e) => setStaffForm({ ...staffForm, branch_id: e.target.value })}>
                    <option value="">Select…</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              {isGeneralAdmin && staffForm.role === 'admin' && (
                <div className="field">
                  <label>Branch (leave blank for general admin)</label>
                  <select value={staffForm.branch_id} onChange={(e) => setStaffForm({ ...staffForm, branch_id: e.target.value })}>
                    <option value="">General admin (all branches)</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {staffForm.role === 'doctor' && (
              <div className="form-row">
                <div className="field">
                  <label>Specialty</label>
                  <input value={staffForm.specialty} onChange={(e) => setStaffForm({ ...staffForm, specialty: e.target.value })} />
                </div>
                <div className="field">
                  <label>Department</label>
                  <input value={staffForm.department} onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })} />
                </div>
                <div className="field" style={{ maxWidth: 160 }}>
                  <label>Consultation fee</label>
                  <input type="number" step="0.01" value={staffForm.consultation_fee} onChange={(e) => setStaffForm({ ...staffForm, consultation_fee: e.target.value })} />
                </div>
              </div>
            )}

            <button className="btn btn-primary btn-sm">Create account</button>
          </form>
        )}

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Branch</th><th>Contact</th>{isGeneralAdmin && <th>Move to</th>}</tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>{s.full_name}{!s.is_active && <span className="badge neutral" style={{ marginLeft: 6 }}>inactive</span>}</td>
                  <td>{ROLE_LABELS[s.role] || s.role}</td>
                  <td>{s.branch_name || <span style={{ color: 'var(--muted)' }}>General admin</span>}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{s.email}{s.phone ? ` · ${s.phone}` : ''}</td>
                  {isGeneralAdmin && (
                    <td>
                      <select
                        value={s.branch_id || ''}
                        onChange={(e) => handleReassign(s, e.target.value || null)}
                        disabled={s.role !== 'admin' && !s.branch_id}
                      >
                        {s.role === 'admin' && <option value="">General admin</option>}
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
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
