import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { io, Socket } from 'socket.io-client';

import type { BoardElement } from '@/utils/api';

export type CursorPayload = { userId: string; x: number; y: number };

export interface UseBoardSocketOptions {
  userId: string | undefined;
  boardId: string | undefined;
  onElementUpserted: (el: BoardElement) => void;
  onElementDeleted: (payload: { elementId: string }) => void;
  onCleared: () => void;
  onCursor: (payload: CursorPayload) => void;
}

export function useBoardSocket({
  userId,
  boardId,
  onElementUpserted,
  onElementDeleted,
  onCleared,
  onCursor,
}: UseBoardSocketOptions) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  // Keep callbacks in refs so the effect never needs to re-run when they change
  const onElementUpsertedRef = useRef(onElementUpserted);
  const onElementDeletedRef = useRef(onElementDeleted);
  const onClearedRef = useRef(onCleared);
  const onCursorRef = useRef(onCursor);
  onElementUpsertedRef.current = onElementUpserted;
  onElementDeletedRef.current = onElementDeleted;
  onClearedRef.current = onCleared;
  onCursorRef.current = onCursor;

  useEffect(() => {
    if (!userId) return;

    const s = io(`${import.meta.env.VITE_API_BASE_URL}/boards`, {
      auth: { userId, token: localStorage.getItem('token') },
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = s;

    if (boardId) {
      s.emit('board:join', { boardId });
    }

    s.on('board:element_upserted', (el: BoardElement) => {
      onElementUpsertedRef.current(el);
    });

    s.on('board:element_deleted', (payload: { elementId: string }) => {
      onElementDeletedRef.current(payload);
    });

    s.on('board:cleared', () => {
      onClearedRef.current();
    });

    s.on('board:cursor', (payload: CursorPayload) => {
      onCursorRef.current(payload);
    });

    s.on('board:member_added', () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    });

    s.on('board:member_removed', () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    });

    return () => {
      if (boardId) s.emit('board:leave', { boardId });
      s.disconnect();
      socketRef.current = null;
    };
  }, [userId, boardId, queryClient]);

  const draw = (element: object, onAck?: (saved: BoardElement) => void) => {
    if (!socketRef.current) return;
    socketRef.current.emit(
      'board:draw',
      { boardId, element },
      (saved: BoardElement) => {
        if (saved && onAck) onAck(saved);
      },
    );
  };

  const deletElement = (elementId: string) => {
    socketRef.current?.emit('board:delete_element', { boardId, elementId });
  };

  const clear = () => {
    socketRef.current?.emit('board:clear', { boardId });
  };

  const sendCursor = (x: number, y: number) => {
    socketRef.current?.emit('board:cursor', { boardId, x, y });
  };

  return { draw, deletElement, clear, sendCursor, socketRef };
}
