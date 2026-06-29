import { io } from 'socket.io-client';

/**
 * Admin realtime socket. Connects to the same origin (Vite proxies /socket.io to
 * the backend in dev; same-origin in prod) with the access token in the
 * handshake. The backend joins admin/super_admin sockets to 'admin-room' and
 * pushes 'admin-activity' events for new orders/withdrawals/escalations/etc.
 *
 * Usage: adminSocket.connect() on login, adminSocket.disconnect() on logout,
 * adminSocket.on(event, handler) to subscribe (returns an unsubscribe fn).
 */
let socket = null;

function connect() {
  if (socket && socket.connected) return socket;
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  // Reuse an existing (disconnected) instance — just refresh auth + reconnect.
  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }
  socket = io(window.location.origin, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
  return socket;
}

function disconnect() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Subscribe to an event; returns an unsubscribe function. */
function on(event, handler) {
  if (!socket) connect();
  socket?.on(event, handler);
  return () => socket?.off(event, handler);
}

export default { connect, disconnect, on, get raw() { return socket; } };
