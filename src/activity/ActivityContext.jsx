import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import adminSocket from '../api/adminSocket';
import { useAuth } from '../auth/AuthContext';

/**
 * Live admin activity: new-since-last-seen badge counts per kind + a rolling
 * feed for the notifications bell. Driven entirely by the 'admin-activity'
 * socket event (no REST seed). Counts reset to 0 when the matching page is
 * visited (clear(kind)). Persisted to localStorage so a reload keeps unseen
 * counts. Connects the socket while logged in; disconnects on logout.
 */
const ActivityContext = createContext(null);
export const useActivity = () => useContext(ActivityContext);

// Badge kinds emitted by the backend.
export const KINDS = ['order', 'order_support', 'withdrawal', 'bank_account', 'escalation', 'enquiry', 'support', 'kyc', 'astrologer_registration'];

const COUNTS_KEY = 'admin.activity.counts';
const FEED_KEY = 'admin.activity.feed';
const FEED_CAP = 50;

const loadJson = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
};

export function ActivityProvider({ children }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState(() => loadJson(COUNTS_KEY, {}));
  const [feed, setFeed] = useState(() => loadJson(FEED_KEY, []));
  const seq = useRef(0); // monotonic id for feed items (Date.now() unavailable concerns aside, fine in browser)

  // Persist on change.
  useEffect(() => { localStorage.setItem(COUNTS_KEY, JSON.stringify(counts)); }, [counts]);
  useEffect(() => { localStorage.setItem(FEED_KEY, JSON.stringify(feed)); }, [feed]);

  // Connect socket + subscribe while authenticated.
  useEffect(() => {
    if (!user) { adminSocket.disconnect(); return; }
    adminSocket.connect();
    const off = adminSocket.on('admin-activity', (evt) => {
      if (!evt || !KINDS.includes(evt.kind)) return;
      setCounts((c) => ({ ...c, [evt.kind]: (c[evt.kind] || 0) + 1 }));
      setFeed((f) => {
        const item = {
          _id: `${Date.now()}-${seq.current++}`,
          kind: evt.kind,
          title: evt.title || `New ${evt.kind}`,
          refId: evt.id,
          at: new Date().toISOString(),
          read: false,
        };
        return [item, ...f].slice(0, FEED_CAP);
      });
    });
    return off;
  }, [user]);

  // Reset a kind's badge (called when the admin opens that page).
  const clear = useCallback((kind) => {
    setCounts((c) => (c[kind] ? { ...c, [kind]: 0 } : c));
  }, []);

  const markAllRead = useCallback(() => {
    setFeed((f) => f.map((i) => (i.read ? i : { ...i, read: true })));
  }, []);

  const markRead = useCallback((id) => {
    setFeed((f) => f.map((i) => (i._id === id ? { ...i, read: true } : i)));
  }, []);

  const unread = feed.reduce((n, i) => n + (i.read ? 0 : 1), 0);

  return (
    <ActivityContext.Provider value={{ counts, feed, unread, clear, markAllRead, markRead }}>
      {children}
    </ActivityContext.Provider>
  );
}
