import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';
import { connectSocket } from '../socket';
import ChatWindow from '../components/ChatWindow';

// Available to every staff role — admin, doctor, nurse, receptionist can
// all message each other here, no clinical relationship required (unlike
// the doctor<->patient Messages page).
export default function StaffMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showContacts, setShowContacts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.staffChat.conversations();
      setConversations(data.conversations);
      if (!selectedId && data.conversations.length > 0) {
        setSelectedId(data.conversations[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;
    function handleMessage() {
      load();
    }
    socket.on('staff_chat:message', handleMessage);
    return () => socket.off('staff_chat:message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadContacts() {
    setError('');
    try {
      const data = await api.staffChat.contacts();
      setContacts(data.contacts);
      setShowContacts(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function startConversation(otherUserId) {
    setError('');
    try {
      const { conversation } = await api.staffChat.startConversation(otherUserId);
      setShowContacts(false);
      setSelectedId(conversation.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Communication</div>
          <h1>Team Chat</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadContacts}>+ New conversation</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showContacts && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Message a coworker</div>
          {contacts.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>No other staff accounts yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {contacts.map((c) => (
                <button
                  key={c.id}
                  className="btn btn-ghost btn-sm"
                  style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
                  onClick={() => startConversation(c.id)}
                >
                  <span>{c.full_name}</span>
                  <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{c.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 0, maxHeight: '68vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 16, fontSize: '0.85rem', color: 'var(--muted)' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 16, fontSize: '0.85rem', color: 'var(--muted)' }}>
              No conversations yet. Start one from the button above.
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--line)',
                  background: c.id === selectedId ? '#FBFAF7' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.other_name}</div>
                  {c.unread_count > 0 && <span className="badge busy">{c.unread_count}</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2, textTransform: 'capitalize' }}>{c.other_role}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.last_message || 'No messages yet'}
                </div>
              </div>
            ))
          )}
        </div>

        {selected ? (
          <ChatWindow
            conversation={{ ...selected, other_detail: selected.other_role ? selected.other_role[0].toUpperCase() + selected.other_role.slice(1) : undefined }}
            currentUserId={user.id}
            kind="staff"
          />
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '68vh', color: 'var(--muted)' }}>
            Select a conversation, or start a new one.
          </div>
        )}
      </div>
    </div>
  );
}
