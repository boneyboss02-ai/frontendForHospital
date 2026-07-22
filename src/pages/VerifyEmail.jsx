import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  // Arrives here either from Register.jsx (just signed up) or Login.jsx
  // (tried to log into an unverified account) — both pass user_id/email
  // via router state.
  const { user_id, email } = location.state || {};

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!user_id) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">Wardline<span className="dot">.</span></div>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            We don't have a pending signup to verify. If you just signed up, go back and try
            again; if you already have an account, sign in instead.
          </p>
          <div style={{ marginTop: 16, fontSize: '0.85rem', display: 'flex', gap: 16, justifyContent: 'center' }}>
            <Link to="/register">Sign up</Link>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyEmail(user_id, code);
      navigate('/portal');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setResendMessage('');
    setResending(true);
    try {
      const result = await api.resendVerificationCode(user_id);
      setResendMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">Wardline<span className="dot">.</span></div>
        <div className="login-sub">
          {email ? <>Enter the code we sent to <strong>{email}</strong></> : 'Enter your verification code'}
        </div>

        {error && <div className="error-banner">{error}</div>}
        {resendMessage && <div className="notice-banner">{resendMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>6-digit code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              autoFocus
              required
              style={{ fontSize: '1.4rem', letterSpacing: '0.3em', textAlign: 'center' }}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading || code.length !== 6}>
            {loading ? 'Verifying…' : 'Verify & continue'}
          </button>
        </form>

        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', marginTop: 12 }}
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? 'Sending…' : "Didn't get a code? Resend"}
        </button>

        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 14, textAlign: 'center' }}>
          Codes expire after 10 minutes. If SMTP isn't configured on the
          server, check its terminal output instead of your inbox.
        </p>
      </div>
    </div>
  );
}
