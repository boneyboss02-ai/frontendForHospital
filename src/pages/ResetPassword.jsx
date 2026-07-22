import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">Wardline<span className="dot">.</span></div>
          <div className="error-banner">This reset link is missing its token. Please use the link from your email, or request a new one.</div>
          <div style={{ marginTop: 16, fontSize: '0.85rem', textAlign: 'center' }}>
            <Link to="/forgot-password">Request a new reset link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">Wardline<span className="dot">.</span></div>
        <div className="login-sub">Choose a new password</div>

        {error && <div className="error-banner">{error}</div>}

        {success ? (
          <p style={{ fontSize: '0.9rem' }}>Password updated. Redirecting you to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 16, fontSize: '0.85rem', textAlign: 'center' }}>
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
