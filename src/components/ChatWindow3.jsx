import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { connectSocket } from '../socket';

// Renders one open conversation: message history, composer, live updates.
// Used by the staff Messages page, the patient portal, AND team chat
// (staff<->staff) — `kind` picks which backend namespace and socket event
// names to use; everything else about rendering a thread is identical.
export default function ChatWindow({ conversation, currentUserId, kind = 'patient' }) {
  const apiNs = kind === 'staff' ? api.staffChat : api.chat;
  const messageEvent = kind === 'staff' ? 'staff_chat:message' : 'chat:message';
  const typingEvent = kind === 'staff' ? 'staff_chat:typing' : 'chat:typing';

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await apiNs.messages(conversation.id);
      setMessages(data.messages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setOtherTyping(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;

    function handleMessage(message) {
      if (message.conversation_id !== conversation.id) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      if (message.sender_id !== currentUserId) setOtherTyping(false);
    }

    function handleTyping({ conversation_id, is_typing }) {
      if (conversation_id !== conversation.id) return;
      setOtherTyping(!!is_typing);
    }

    socket.on(messageEvent, handleMessage);
    socket.on(typingEvent, handleTyping);
    return () => {
      socket.off(messageEvent, handleMessage);
      socket.off(typingEvent, handleTyping);
    };
  }, [conversation.id, currentUserId, messageEvent, typingEvent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  function notifyTyping(isTyping) {
    const socket = connectSocket();
    socket?.emit(typingEvent, { conversation_id: conversation.id, is_typing: isTyping });
  }

  function handleDraftChange(e) {
    setDraft(e.target.value);
    notifyTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => notifyTyping(false), 2000);
  }

  async function handleSend(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError('');
    clearTimeout(typingTimeoutRef.current);
    notifyTyping(false);
    try {
      const { message } = await apiNs.sendMessage(conversation.id, body);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setDraft('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '68vh', padding: 0 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontWeight: 700 }}>{conversation.other_name}</div>
        {conversation.other_detail && (
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{conversation.other_detail}</div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No messages yet. Say hello.</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '8px 12px',
                    borderRadius: 12,
                    borderBottomRightRadius: mine ? 2 : 12,
                    borderBottomLeftRadius: mine ? 12 : 2,
                    background: mine ? 'var(--teal-500)' : 'var(--sky-100)',
                    color: mine ? '#fff' : 'var(--ink)',
                    fontSize: '0.88rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.body}
                  <div
                    className="mono"
                    style={{
                      fontSize: '0.65rem', marginTop: 4, textAlign: 'right',
                      color: mine ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                    }}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {otherTyping && (
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
            {conversation.other_name} is typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="error-banner" style={{ margin: '0 18px 10px' }}>{error}</div>}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 10, padding: '12px 18px', borderTop: '1px solid var(--line)' }}>
        <input
          value={draft}
          onChange={handleDraftChange}
          placeholder="Write a message..."
          disabled={sending}
        />
        <button className="btn btn-primary" type="submit" disabled={sending || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
