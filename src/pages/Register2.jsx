import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const [mode, setMode] = useState('new'); // 'new' | 'existing'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        email, password, phone,
        date_of_birth: dob || undefined,
      };
      if (mode === 'existing') {
        payload.patient_code = patientCode;
      } else {
        payload.full_name = fullName;
        payload.gender = gender || undefined;
        payload.address = address || undefined;
      }
      const result = await register(payload);
      navigate('/verify-email', { state: { user_id: result.user_id, email: result.email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card" style={{ width: 420 }}>
        <div className="login-brand">Wardline<span className="dot">.</span></div>
        <div className="login-sub">Create your patient portal account</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button
            type="button"
            className={mode === 'new' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => setMode('new')}
          >
            I'm a new patient
          </button>
          <button
            type="button"
            className={mode === 'existing' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => setMode('existing')}
          >
            I've visited before
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'existing' && (
            <div className="field">
              <label>Patient code</label>
              <input
                value={patientCode}
                onChange={(e) => setPatientCode(e.target.value)}
                placeholder="e.g. PT-2026-0001"
                required
              />
            </div>
          )}

          {mode === 'new' && (
            <div className="field">
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}

          <div className="form-row">
            <div className="field">
              <label>Date of birth {mode === 'existing' ? '(to verify your identity, along with phone)' : ''}</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required={mode === 'existing'} />
            </div>
            {mode === 'new' && (
              <div className="field">
                <label>Gender</label>
                <input value={gender} onChange={(e) => setGender(e.target.value)} />
              </div>
            )}
          </div>

          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Phone {mode === 'existing' ? '(to verify your identity, along with date of birth)' : ''}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required={mode === 'existing'}
            />
          </div>
          {mode === 'new' && (
            <div className="field">
              <label>Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: '0.85rem', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
