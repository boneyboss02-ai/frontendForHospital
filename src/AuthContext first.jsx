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

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('wardline_token', token);
    localStorage.setItem('wardline_user', JSON.stringify(user));
    setUser(user);
    connectSocket();
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user } = await api.registerPatient(payload);
    localStorage.setItem('wardline_token', token);
    localStorage.setItem('wardline_user', JSON.stringify(user));
    setUser(user);
    connectSocket();
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
    <AuthContext.Provider value={{ user, login, register, logout, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
