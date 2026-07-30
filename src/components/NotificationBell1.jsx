import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { connectSocket } from '../socket';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  async function load() {
    try {
      const data = await api.notifications.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // Silently ignore — a failed notification poll shouldn't disrupt the app.
    }
  }

  useEffect(() => {
    load();
    // Polling stays as a fallback/initial sync — the socket below delivers
    // new notifications instantly while connected, but polling still covers
    // reconnects, missed events, and the brief window before the socket
    // finishes connecting.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // connectSocket() is idempotent — it reuses the existing connection if
    // AuthContext already made one, or creates it here if this effect
    // happens to run first (child effects run before parent effects on
    // mount, so we can't assume AuthContext's connect call has happened yet).
    const socket = connectSocket();
    if (!socket) return undefined;

    function handleNotification(notification) {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
  }

  async function markRead(id) {
    try {
      await api.notifications.markRead(id);
      load();
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await api.notifications.markAllRead();
      load();
    } catch {
      // ignore
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={handleOpen}
        style={{ position: 'relative' }}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: '#fff',
            borderRadius: '100px', fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 30, marginTop: 8,
          width: 320, maxHeight: 400, overflowY: 'auto',
          background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
          boxShadow: '0 8px 24px rgba(18,36,43,0.14)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
            <strong style={{ fontSize: '0.85rem' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 16, fontSize: '0.85rem', color: 'var(--muted)' }}>No notifications yet.</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read_at && markRead(n.id)}
                style={{
                  padding: '10px 14px', borderBottom: '1px solid var(--line)', cursor: n.read_at ? 'default' : 'pointer',
                  background: n.read_at ? 'transparent' : '#FBFAF7',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                {n.message && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{n.message}</div>}
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 }} className="mono">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
