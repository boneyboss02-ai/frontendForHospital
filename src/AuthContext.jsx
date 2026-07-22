import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from './api/client';
import { connectSocket, disconnectSocket } from './socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('wardline_user');
    return raw ? JSON.parse(raw) : null;
  });

  // If the page loads with an existing session (token already in
  // localStorage), connect the socket right away rather than waiting for
  // another login call.
  useEffect(() => {
    if (user) connectSocket();
    return () => disconnectSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function establishSession(token, user) {
    localStorage.setItem('wardline_token', token);
    localStorage.setItem('wardline_user', JSON.stringify(user));
    setUser(user);
    connectSocket();
  }

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.login(email, password);
    establishSession(token, user);
    return user;
  }, []);

  // Just creates the (unverified) account and sends back { pending_verification,
  // user_id, email } — does NOT log the person in. They still need to enter
  // the code emailed to them (see verifyEmail below) before any session exists.
  const register = useCallback(async (payload) => {
    return api.registerPatient(payload);
  }, []);

  // Completes signup after the emailed code is entered correctly. This is
  // the actual moment a brand-new self-signup account becomes usable.
  const verifyEmail = useCallback(async (user_id, code) => {
    const { token, user } = await api.verifyEmail(user_id, code);
    establishSession(token, user);
    return user;
  }, []);

  // Called after a successful password change to clear the
  // must_change_password flag locally without requiring a re-login.
  const clearMustChangePassword = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, must_change_password: false };
      localStorage.setItem('wardline_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wardline_token');
    localStorage.removeItem('wardline_user');
    setUser(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, verifyEmail, logout, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
