import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, UserPlus, Users } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiErrorAlert } from '@/components/ApiErrorAlert';
import BoardToolbar from '@/components/board-canvas/BoardToolbar';
import { getBBox } from '@/components/board-canvas/geometry';
import { redrawAll } from '@/components/board-canvas/renderer';
import {
  DEFAULT_TRANSFORM,
  type DrawTool,
  type LocalElement,
  type Point,
  type Transform,
} from '@/components/board-canvas/types';
import { useBoardHistory } from '@/components/board-canvas/use-board-history';
import { useBoardPointer } from '@/components/board-canvas/use-board-pointer';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import UserAvatar from '@/components/UserAvatar';
import { useAuth } from '@/hooks/use-auth';
import { useBoardSocket } from '@/hooks/use-board-socket';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  addBoardMember,
  clearBoardElements,
  getBoard,
  getBoardElements,
  removeBoardMember,
  searchUsers,
  type Board,
  type BoardElement,
  type BoardMember,
  type User,
} from '@/utils/api';

export default function BoardCanvasPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);

  // Elements state is mirrored into a ref so pointer handlers always see
  // the latest value without stale closure issues.
  const elementsRef = useRef<LocalElement[]>([]);
  const [elements, _setElements] = useState<LocalElement[]>([]);
  const setElements = useCallback(
    (updater: LocalElement[] | ((prev: LocalElement[]) => LocalElement[])) => {
      _setElements((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        elementsRef.current = next;
        return next;
      });
    },
    [],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  // Flags to block server events during undo/redo (prevents race conditions)
  const ignoreDeleteEventsRef = useRef(false);
  const ignoreClearEventsRef = useRef(false);
  const toolRef = useRef<DrawTool>('pen');
  const colorRef = useRef('#000000');
  const strokeWidthRef = useRef(3);
  const nextZ = useRef(0);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

  const {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    setCanUndo,
    setCanRedo,
    pushHistory,
    clearHistory,
  } = useBoardHistory();

  const [textInputVisible, setTextInputVisible] = useState(false);
  const [textInputPos, setTextInputPos] = useState<Point>({ x: 0, y: 0 });
  const [textInputVal, setTextInputVal] = useState('');
  const [textInputFontSize, setTextInputFontSize] = useState(18);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] =
    useState<BoardMember | null>(null);
  const [inviteQuery, setInviteQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; email: string; displayName?: string; avatarUrl?: string }[]
  >([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
  } | null>(null);

  const {
    data: board,
    isLoading: boardLoading,
    isError: boardError,
    refetch: refetchBoard,
  } = useQuery<Board>({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const res = await getBoard(user!.id, boardId!);
      return res.data as Board;
    },
    enabled: !!user && !!boardId,
  });

  const { data: fetchedElements } = useQuery<LocalElement[]>({
    queryKey: ['boardElements', boardId],
    queryFn: async () => {
      const res = await getBoardElements(user!.id, boardId!);
      const raw: BoardElement[] = res.data ?? [];
      return raw.map((e) => ({
        ...e,
        transform: (e.data._transform as Transform) ?? DEFAULT_TRANSFORM,
      }));
    },
    enabled: !!user && !!boardId,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (!fetchedElements) return;
    setElements(fetchedElements);
    if (fetchedElements.length)
      nextZ.current = Math.max(...fetchedElements.map((e) => e.zIndex)) + 1;
  }, [fetchedElements, setElements]);

  // Reset local state on unmount to prevent stale elements on re-open.
  useEffect(() => {
    return () => setElements([]);
  }, [setElements]);

  const {
    draw: wsDraw,
    deletElement: wsDelete,
    clear: wsClear,
  } = useBoardSocket({
    userId: user?.id,
    boardId,
    onElementUpserted: (el) =>
      setElements((prev) => {
        const withTransform: LocalElement = {
          ...el,
          transform:
            ((el.data as Record<string, unknown>)._transform as Transform) ??
            DEFAULT_TRANSFORM,
        };
        const byId = prev.findIndex((e) => e.id === el.id);
        if (byId >= 0) {
          const next = [...prev];
          next[byId] = withTransform;
          return next;
        }
        // If a tmp-prefixed optimistic entry for this author exists, the ack
        // callback will replace it — ignore the broadcast to prevent duplicates.
        const hasTmp = prev.some(
          (e) => e.id.startsWith('tmp-') && e.authorId === el.authorId,
        );
        if (hasTmp) return prev;
        return [...prev, withTransform];
      }),
    onElementDeleted: ({ elementId }) => {
      // Block server delete events during undo/redo operations
      if (ignoreDeleteEventsRef.current) {
        return;
      }
      setElements((prev) => prev.filter((e) => e.id !== elementId));
    },
    onCleared: () => {
      // Block server clear events during undo/redo operations
      if (ignoreClearEventsRef.current) {
        return;
      }
      setElements([]);
    },
    onCursor: () => {},
  });

  // Updates color visually while the picker is open (no history entry).
  const handleColorPreview = useCallback(
    (newColor: string) => {
      setColor(newColor);
      const selId = selectedIdRef.current;
      if (!selId) return;
      setElements((prev) =>
        prev.map((el) => (el.id === selId ? { ...el, color: newColor } : el)),
      );
    },
    [setElements],
  );

  // Commits a color change: pushes to undo history and syncs via WebSocket.
  const handleColorChange = useCallback(
    (newColor: string) => {
      setColor(newColor);
      const selId = selectedIdRef.current;
      if (!selId) return;
      pushHistory(elementsRef.current);
      setElements((prev) =>
        prev.map((el) => (el.id === selId ? { ...el, color: newColor } : el)),
      );
      const el = elementsRef.current.find((x) => x.id === selId);
      if (el) {
        wsDraw({
          id: el.id,
          type: el.type,
          data: { ...el.data, _transform: el.transform },
          color: newColor,
          strokeWidth: el.strokeWidth,
          zIndex: el.zIndex,
        });
      }
    },
    [pushHistory, setElements, wsDraw],
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width > 0 && canvas.height > 0) {
      redrawAll(canvas, elements, selectedId);
    } else {
      // Canvas not yet sized — retry on next animation frame.
      const id = requestAnimationFrame(() => {
        if (canvas.width > 0 && canvas.height > 0)
          redrawAll(canvas, elementsRef.current, selectedIdRef.current);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [elements, selectedId]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      redrawAll(canvas, elementsRef.current, selectedIdRef.current);
    };
    const id = requestAnimationFrame(resize);
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, []);

  const clearMutation = useMutation({
    mutationFn: async () => {
      await clearBoardElements(user!.id, boardId!);
      wsClear();
    },
    onSuccess: () => {
      setElements([]);
      clearHistory();
      queryClient.invalidateQueries({ queryKey: ['boardElements', boardId] });
    },
    onError: () => toast.error('Failed to clear board'),
  });

  const inviteMutation = useMutation({
    mutationFn: (targetId: string) =>
      addBoardMember(user!.id, boardId!, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setInviteOpen(false);
      setInviteQuery('');
      setSelectedUser(null);
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (targetId: string) =>
      removeBoardMember(user!.id, boardId!, targetId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['board', boardId] }),
    onError: () => toast.error('Failed to remove member'),
  });

  useEffect(() => {
    if (inviteQuery.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    if (selectedUser && inviteQuery === selectedUser.email) return;
    const t = setTimeout(async () => {
      try {
        const res = await searchUsers(inviteQuery);
        setSearchResults((res.data as User[]) ?? []);
        setSearchOpen(true);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [inviteQuery, selectedUser]);

  const dragHistorySnapshot = useRef<LocalElement[]>([]);

  const commitElement = useCallback(
    (payload: {
      type: 'path' | 'line' | 'rect' | 'ellipse' | 'text';
      data: Record<string, unknown>;
      color: string;
      strokeWidth: number;
      zIndex: number;
    }) => {
      pushHistory(elementsRef.current);
      const tmpId = `tmp-${Date.now()}-${Math.random()}`;
      const tmpEl: LocalElement = {
        // optimistic local entry
        id: tmpId,
        boardId: boardId!,
        authorId: user!.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transform: DEFAULT_TRANSFORM,
        ...payload,
      };
      setElements((prev) => [...prev, tmpEl]);
      // Send to server; replace the optimistic entry with the real one on ack.
      wsDraw(
        {
          ...payload,
          data: { ...payload.data, _transform: DEFAULT_TRANSFORM },
        },
        (saved: BoardElement) => {
          const savedEl: LocalElement = {
            ...saved,
            transform:
              ((saved.data as Record<string, unknown>)
                ._transform as Transform) ?? DEFAULT_TRANSFORM,
          };
          setElements((prev) =>
            prev.map((el) => (el.id === tmpId ? savedEl : el)),
          );
        },
      );
    },
    [boardId, user, wsDraw, pushHistory, setElements],
  );

  const { onPointerDown, onPointerMove, onPointerUp } = useBoardPointer({
    canvasRef,
    elementsRef,
    toolRef,
    colorRef,
    strokeWidthRef,
    selectedIdRef,
    nextZRef: nextZ,
    setElements,
    setSelectedId,
    setTextInputPos,
    setTextInputVal,
    setTextInputFontSize,
    setTextInputVisible,
    setEditingElementId,
    textInputRef,
    pushHistory,
    dragHistorySnapshot,
    wsDraw,
    commitElement,
  });

  const commitText = useCallback(() => {
    if (!textInputVal.trim()) {
      // Empty input: restore the original element from the server.
      if (editingElementId) {
        queryClient.invalidateQueries({ queryKey: ['boardElements', boardId] });
      }
      setTextInputVisible(false);
      setEditingElementId(null);
      return;
    }
    if (editingElementId) {
      // Original was removed from local state; delete it on server and commit updated version.
      wsDelete(editingElementId);
      commitElement({
        type: 'text',
        data: {
          x: textInputPos.x,
          y: textInputPos.y + textInputFontSize,
          text: textInputVal,
          fontSize: textInputFontSize,
        },
        color: colorRef.current,
        strokeWidth: strokeWidthRef.current,
        zIndex: nextZ.current++,
      });
      setEditingElementId(null);
    } else {
      const z = nextZ.current++;
      commitElement({
        type: 'text',
        data: {
          x: textInputPos.x,
          y: textInputPos.y + 16,
          text: textInputVal,
          fontSize: textInputFontSize,
        },
        color: colorRef.current,
        strokeWidth: strokeWidthRef.current,
        zIndex: z,
      });
    }
    setTextInputVisible(false);
    setTextInputVal('');
  }, [
    textInputVal,
    textInputPos,
    textInputFontSize,
    editingElementId,
    commitElement,
    wsDelete,
    boardId,
    queryClient,
    colorRef,
    strokeWidthRef,
  ]);

  const doUndo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;
    redoStack.current.push(elementsRef.current);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
    // Block server events during undo to prevent race conditions
    ignoreDeleteEventsRef.current = true;
    ignoreClearEventsRef.current = true;
    // Clear entire board and redraw from snapshot for atomic operation
    wsClear();
    snapshot.forEach((el) =>
      wsDraw({
        type: el.type,
        data: { ...el.data, _transform: el.transform },
        color: el.color,
        strokeWidth: el.strokeWidth,
        zIndex: el.zIndex,
      }),
    );
    setElements(snapshot);
    // Re-enable server events after a short delay
    setTimeout(() => {
      ignoreDeleteEventsRef.current = false;
      ignoreClearEventsRef.current = false;
    }, 300);
  }, [
    undoStack,
    redoStack,
    setCanUndo,
    setCanRedo,
    wsClear,
    wsDraw,
    setElements,
  ]);

  const doRedo = useCallback(() => {
    const snapshot = redoStack.current.pop();
    if (!snapshot) return;
    undoStack.current.push(elementsRef.current);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
    // Block server events during redo to prevent race conditions
    ignoreDeleteEventsRef.current = true;
    ignoreClearEventsRef.current = true;
    // Clear entire board and redraw from snapshot for atomic operation
    wsClear();
    snapshot.forEach((el) =>
      wsDraw({
        type: el.type,
        data: { ...el.data, _transform: el.transform },
        color: el.color,
        strokeWidth: el.strokeWidth,
        zIndex: el.zIndex,
      }),
    );
    setElements(snapshot);
    // Re-enable server events after a short delay
    setTimeout(() => {
      ignoreDeleteEventsRef.current = false;
      ignoreClearEventsRef.current = false;
    }, 300);
  }, [
    undoStack,
    redoStack,
    setCanUndo,
    setCanRedo,
    wsClear,
    wsDraw,
    setElements,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = document.activeElement;
      const inInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (inInput) return;
        e.preventDefault();
        doUndo();
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'z' &&
        e.shiftKey
      ) {
        if (inInput) return;
        e.preventDefault();
        doRedo();
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedIdRef.current
      ) {
        if (inInput) return;
        const id = selectedIdRef.current;
        pushHistory(elementsRef.current);
        setElements((prev) => prev.filter((el) => el.id !== id));
        setSelectedId(null);
        wsDelete(id);
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setTextInputVisible(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pushHistory, setElements, wsDelete, doUndo, doRedo]);

  const isOwner = board?.ownerId === user?.id;

  if (!user) return null;

  const canvasCursor =
    tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair';

  return (
    <PageShell
      title={board?.title}
      parentCrumbs={[{ label: 'Whiteboards', path: '/boards' }]}
      fullHeight
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/boards">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Users className="size-4" />
                <span>{board?.members?.length ?? 0}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel>Members</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {board?.members?.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-sm">
                    {m.user?.displayName ?? m.user?.email ?? 'Member'}
                  </span>
                  {isOwner && m.userId !== user.id && (
                    <button
                      className="text-xs !text-destructive hover:underline"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setRemoveMemberTarget(m);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="size-4" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          )}

          {isOwner && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setClearOpen(true)}
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-2 sm:flex-row sm:gap-3">
        <BoardToolbar
          tool={tool}
          setTool={setTool}
          color={color}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={doUndo}
          onRedo={doRedo}
          handleColorPreview={handleColorPreview}
          handleColorChange={handleColorChange}
          elementsRef={elementsRef}
          undoStackRef={undoStack}
          redoStackRef={redoStack}
        />

        <div
          ref={containerRef}
          className="relative flex-1 min-h-0 overflow-hidden rounded-lg border bg-white"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            style={{
              cursor: canvasCursor,
              width: '100%',
              height: '100%',
              display: 'block',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={(e) => {
              const rect = canvasRef.current!.getBoundingClientRect();
              const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
              const hitEl = [...elementsRef.current]
                .sort((a, b) => b.zIndex - a.zIndex)
                .find((el) => {
                  if (el.type !== 'text') return false;
                  const bb = getBBox(el);
                  return (
                    pos.x >= bb.x &&
                    pos.x <= bb.x + bb.w &&
                    pos.y >= bb.y &&
                    pos.y <= bb.y + bb.h
                  );
                });
              if (!hitEl) return;
              const d = hitEl.data as {
                x: number;
                y: number;
                text: string;
                fontSize?: number;
              };
              const fs = d.fontSize ?? Math.max(12, hitEl.strokeWidth * 6);
              setTextInputPos({
                x: d.x + (hitEl as LocalElement).transform.tx,
                y: d.y + (hitEl as LocalElement).transform.ty - fs,
              });
              setTextInputVal(d.text as string);
              setTextInputFontSize(fs);
              setEditingElementId(hitEl.id);
              setSelectedId(null);
              setElements((prev) => prev.filter((el) => el.id !== hitEl.id));
              setTextInputVisible(true);
              setTimeout(() => {
                textInputRef.current?.focus();
                textInputRef.current?.select();
              }, 0);
            }}
          />

          {boardError && (
            <div className="absolute inset-0 flex items-start justify-center bg-white/70 p-4">
              <ApiErrorAlert
                title="Failed to load board"
                description="Could not fetch board data. Please try again."
                onRetry={() => refetchBoard()}
              />
            </div>
          )}

          {boardLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <LoadingSpinner />
            </div>
          )}

          {textInputVisible && (
            <input
              ref={textInputRef}
              value={textInputVal}
              onChange={(e) => setTextInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitText();
                if (e.key === 'Escape') {
                  setTextInputVisible(false);
                  setTextInputVal('');
                }
              }}
              onBlur={commitText}
              style={{
                position: 'absolute',
                left: textInputPos.x,
                top: textInputPos.y,
                fontSize: `${textInputFontSize}px`,
                color: color,
                background: 'transparent',
                border: 'none',
                outline: '1px dashed #3b82f6',
                minWidth: 80,
                padding: '0 2px',
                fontFamily: 'sans-serif',
              }}
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </div>
      </div>

      {!isMobile && selectedId && (
        <p className="ml-16 text-xs text-muted-foreground">
          Press{' '}
          <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]">
            Delete
          </kbd>{' '}
          to remove selected element
        </p>
      )}

      <ResponsiveModal open={inviteOpen} onOpenChange={setInviteOpen}>
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader className="border-b md:border-0">
            <ResponsiveModalTitle className="text-xl">
              Invite to board
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Search for a user to add as a member of this board.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <div className="space-y-4 p-4 md:p-0">
            <div className="space-y-2">
              <Label>Search by email</Label>
              <div className="relative">
                <Input
                  placeholder="user@example.com"
                  value={inviteQuery}
                  onChange={(e) => {
                    setInviteQuery(e.target.value);
                    setSelectedUser(null);
                  }}
                  onFocus={() =>
                    !selectedUser &&
                    inviteQuery.length >= 2 &&
                    setSearchOpen(true)
                  }
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  autoComplete="off"
                />
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
                    {searchResults.map((u) => (
                      <Item
                        key={u.id}
                        className="mx-1 my-1 p-1 w-auto cursor-pointer hover:bg-accent"
                        onMouseDown={() => {
                          setSelectedUser(u);
                          setInviteQuery(u.email);
                          setSearchOpen(false);
                        }}
                      >
                        <ItemMedia variant="image">
                          <UserAvatar
                            src={u.avatarUrl}
                            name={u.displayName ?? u.email}
                          />
                        </ItemMedia>
                        <ItemContent>
                          {u.displayName && (
                            <ItemTitle>{u.displayName}</ItemTitle>
                          )}
                          <ItemDescription>{u.email}</ItemDescription>
                        </ItemContent>
                      </Item>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <ResponsiveModalFooter className="border-t md:border-t">
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button
              disabled={!selectedUser || inviteMutation.isPending}
              onClick={() =>
                selectedUser && inviteMutation.mutate(selectedUser.id)
              }
            >
              Add member
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={!!removeMemberTarget}
        onOpenChange={(o) => {
          if (!o) setRemoveMemberTarget(null);
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader className="border-b md:border-0">
            <ResponsiveModalTitle className="text-xl">
              Remove member
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Remove{' '}
              <span className="font-medium text-foreground">
                {removeMemberTarget?.user?.displayName ??
                  removeMemberTarget?.user?.email ??
                  'this member'}
              </span>{' '}
              from the board? They will lose access immediately.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="border-t md:border-t">
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button
              variant="destructive"
              disabled={removeMemberMutation.isPending}
              onClick={() => {
                if (removeMemberTarget) {
                  removeMemberMutation.mutate(removeMemberTarget.userId);
                  setRemoveMemberTarget(null);
                }
              }}
            >
              Remove
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal open={clearOpen} onOpenChange={setClearOpen}>
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader className="border-b md:border-0">
            <ResponsiveModalTitle className="text-xl">
              Clear board
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              All drawings will be permanently deleted. This action cannot be
              undone.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="border-t md:border-t">
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button
              variant="destructive"
              disabled={clearMutation.isPending}
              onClick={() => {
                clearMutation.mutate();
                setClearOpen(false);
              }}
            >
              Clear
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </PageShell>
  );
}
