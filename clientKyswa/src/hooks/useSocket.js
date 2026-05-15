import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let socketInstance = null;

export function useSocket() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.token && socketInstance?.connected) {
      socketInstance.disconnect();
      setConnected(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) return;

    // Créer une seule instance socket
    if (!socketInstance) {
      socketInstance = io('http://localhost:3000', {
        autoConnect: false,
        auth: { token: user.token },
        transports: ['websocket'],
      });
    }

    // Toujours synchroniser le token courant avant connexion/reconnexion
    socketInstance.auth = { token: user.token };
    if (!socketInstance.connected) {
      socketInstance.connect();
    }

    socketInstance.on('connect', () => setConnected(true));
    socketInstance.on('disconnect', () => setConnected(false));

    // Badge notifications
    socketInstance.on('new_message', () => {
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socketInstance.off('new_message');
    };
  }, [user?.token]);

  const sendMessage = (destinataireId, contenu) => {
    if (socketInstance) {
      socketInstance.emit('send_message', { destinataireId, contenu });
    }
  };

  const resetUnread = () => setUnreadCount(0);

  return { socket: socketInstance, connected, unreadCount, resetUnread, sendMessage };
}
