import { useCallback, useRef, useState } from 'react';
import type { LocalElement } from './types';

export function useBoardHistory() {
  const undoStack = useRef<LocalElement[][]>([]);
  const redoStack = useRef<LocalElement[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback((snapshot: LocalElement[]) => {
    undoStack.current.push(snapshot);
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const clearHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    setCanUndo,
    setCanRedo,
    pushHistory,
    clearHistory,
  };
}
