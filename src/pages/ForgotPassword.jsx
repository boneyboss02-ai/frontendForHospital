import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message);
    } catch (err) {
      // The backend always returns a generic success message for this
      // endpoint (so it can't be used to check which emails exist) — an
      // error here means something actually went wrong client-side, like
      // no network connection.
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">Wardline<span className="dot">.</span></div>
        <div className="login-sub">Reset your password</div>

        {error && <div className="error-banner">{error}</div>}
        {message ? (
          <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
            <p>{message}</p>
            <p style={{ color: 'var(--muted)', marginTop: 12 }}>
              If it doesn't arrive in a few minutes, check with the clinic — email delivery
              depends on the mail server being configured.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.org"
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
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
