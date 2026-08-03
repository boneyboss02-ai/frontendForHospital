import { io } from 'socket.io-client';
import { getToken } from './api/client';

let socket = null;

// Matches the dev backend URL hardcoded in vite.config.js's proxy target.
// If you deploy this somewhere other than localhost, update both places.
const BACKEND_URL = 'http://localhost:4000';

// Lazily creates (or reuses) a single socket connection, authenticated with
// the same JWT as REST calls. Call disconnectSocket() on logout so a stale
// session doesn't keep receiving another user's events after switching accounts.
export function connectSocket() {
  const token = getToken();
  if (!token) return null;

  if (socket && socket.connected) return socket;

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
