import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

import { getDmConversations } from '@/utils/api';

export function useChatNotifications(
  userId: string | undefined,
  activePeerId: string | null = null,
): {
  hasUnread: boolean;
  clearUnread: () => void;
} {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const activePeerIdRef = useRef(activePeerId);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    activePeerIdRef.current = activePeerId;
  }, [activePeerId]);

  useEffect(() => {
    if (!userId) return;
    getDmConversations(userId)
      .then((res) => {
        if (res.data.some((c) => c.unreadCount > 0)) setHasUnread(true);
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(`${import.meta.env.VITE_API_BASE_URL}/chat`, {
      auth: { userId, token: localStorage.getItem('token') },
      transports: ['websocket'],
    });

    socket.on(
      'dm:message',
      (msg: {
        senderId: string;
        sender?: { displayName?: string; email?: string };
      }) => {
        if (msg.senderId === userId) return;
        if (
          window.location.pathname === '/chat' &&
          msg.senderId === activePeerIdRef.current
        )
          return;

        setHasUnread(true);

        if (window.location.pathname !== '/chat') {
          const senderName =
            msg.sender?.displayName ?? msg.sender?.email ?? 'Someone';
          toast.info(`New message from ${senderName}`, {
            action: {
              label: 'Open',
              onClick: () => navigateRef.current(`/chat?peer=${msg.senderId}`),
            },
          });
        }
      },
    );

    socket.on('dm:deleted', () => {
      getDmConversations(userId)
        .then((res) => {
          if ((res.data ?? []).every((c) => c.unreadCount === 0))
            setHasUnread(false);
        })
        .catch(() => {});
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  return { hasUnread, clearUnread: () => setHasUnread(false) };
}
