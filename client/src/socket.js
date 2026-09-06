import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5001';
  }
  return `http://${hostname}:5001`;
};

export const socket = io(getSocketUrl(), {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  transports: ['websocket', 'polling']
});

export default socket;
