import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Plus, RefreshCw, Table2, Workflow } from 'lucide-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiErrorAlert } from '@/components/ApiErrorAlert';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserProfileDrawer from '@/components/UserProfileDrawer';
import {
  emptyForm,
  WorkItemDetailDrawer,
  WorkItemFormModal,
  WorkItemsTable,
  WorkItemStatsBar,
  type WorkItemFormState,
} from '@/components/workspace';
import KanbanBoard from '@/components/workspace/KanbanBoard';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePreferences } from '@/hooks/use-preferences';
import { useWorkspaceContext } from '@/hooks/use-workspace-context';
import { useWorkspaceSocket } from '@/hooks/use-workspace-socket';
import {
  createWorkItem,
  createWorkItemComment,
  deleteWorkItem,
  deleteWorkItemComment,
  getOrganizationMembers,
  getOrganizations,
  getWorkItemComments,
  getWorkItems,
  getWorkItemStats,
  reorderWorkItems,
  updateWorkItem,
  updateWorkItemComment,
  type Organization,
  type OrganizationMember,
  type WorkItem,
  type WorkItemComment,
  type WorkItemStats,
  type WorkItemStatus,
} from '@/utils/api';

const formatDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const toWorkItemForm = (item: WorkItem): WorkItemFormState => ({
  title: item.title,
  description: item.description ?? '',
  status: item.status,
  priority: item.priority,
  dueDate: item.dueDate ? parseDateValue(item.dueDate) : undefined,
  assigneeId: item.assigneeId ?? '',
});

const workspaceViewStorageKey = 'workspace:view';

const getInitialWorkspaceView = (): 'table' | 'kanban' => {
  if (typeof window === 'undefined') return 'table';
  return localStorage.getItem(workspaceViewStorageKey) === 'kanban'
    ? 'kanban'
    : 'table';
};

export default function WorkspacePage() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<string | null>(null);
  const pendingDeleteItemRef = useRef<WorkItem | null>(null);
  const deleteFnRef = useRef<(id: string) => void>(() => {});
  const pendingCommentDeleteRef = useRef<string | null>(null);
  const deleteCommentFnRef = useRef<(id: string) => void>(() => {});
  const detailTitleRef = useRef<HTMLInputElement | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<WorkItem | null>(null);
  const [commentDeleteTarget, setCommentDeleteTarget] =
    useState<WorkItemComment | null>(null);
  const [editingComment, setEditingComment] = useState<{
    id: string;
    body: string;
  } | null>(null);
  const [detailItem, setDetailItem] = useState<WorkItem | null>(null);
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');
  const [commentBody, setCommentBody] = useState('');
  const [view, setView] = useState<'table' | 'kanban'>(getInitialWorkspaceView);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loadKanbanItemsError, setLoadKanbanItemsError] =
    useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'all' | 'todo' | 'in_progress' | 'done'
  >('all');
  const [pages, setPages] = useState({
    all: 1,
    todo: 1,
    in_progress: 1,
    done: 1,
  });
  const ITEMS_PER_PAGE = 10;
  const STATUSES = useMemo<WorkItemStatus[]>(
    () => ['todo', 'in_progress', 'done'],
    [],
  );

  // Force table view on mobile (no kanban on small screens)
  useEffect(() => {
    if (isMobile && view === 'kanban') {
      updateView('table');
    }
  }, [isMobile, view]);

  // Combined kanban state per-status (items + pagination)
  const [kanbanState, setKanbanState] = useState({
    todo: {
      items: [] as WorkItem[],
      page: 1,
      hasMore: true,
      loading: false,
      error: false,
    },
    in_progress: {
      items: [] as WorkItem[],
      page: 1,
      hasMore: true,
      loading: false,
      error: false,
    },
    done: {
      items: [] as WorkItem[],
      page: 1,
      hasMore: true,
      loading: false,
      error: false,
    },
  });

  const resetKanbanState = () => {
    setKanbanState({
      todo: { items: [], page: 1, hasMore: true, loading: false, error: false },
      in_progress: {
        items: [],
        page: 1,
        hasMore: true,
        loading: false,
        error: false,
      },
      done: { items: [], page: 1, hasMore: true, loading: false, error: false },
    });
  };
  const navigate = useNavigate();
  const { selectedOrgId, setContext, validateContext } = useWorkspaceContext();

  // On unmount: flush any pending undo-delete operations so nothing is lost.
  useEffect(() => {
    return () => {
      if (undoTimerRef.current && pendingDeleteRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
        deleteFnRef.current(pendingDeleteRef.current);
      }
      if (pendingCommentDeleteRef.current) {
        deleteCommentFnRef.current(pendingCommentDeleteRef.current);
      }
      toast.dismiss();
    };
  }, []);

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<
    Organization[]
  >({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      const res = await getOrganizations(user!.id);
      return res.data as Organization[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (orgsLoading) return;
    validateContext(organizations.map((o) => o.id));
  }, [organizations, orgsLoading, validateContext]);

  const orgIds = useMemo(() => organizations.map((o) => o.id), [organizations]);

  useWorkspaceSocket(user?.id, orgIds);

  const { data: orgMembers = [] } = useQuery<OrganizationMember[]>({
    queryKey: ['orgMembers', selectedOrgId],
    queryFn: async () => {
      const res = await getOrganizationMembers(user!.id, selectedOrgId!);
      return res.data as OrganizationMember[];
    },
    enabled: !!user && !!selectedOrgId,
  });

  const updateView = (nextView: 'table' | 'kanban') => {
    setView(nextView);
    localStorage.setItem(workspaceViewStorageKey, nextView);
  };

  // Table view: load work items with server-side status filter
  const currentPage = pages[activeTab];
  const workItemsKey = [
    'workItems',
    selectedOrgId ?? user?.id,
    activeTab,
    currentPage,
  ] as const;

  const {
    data: paginatedResponse,
    isLoading: loading,
    isError,
    refetch,
  } = useQuery({
    queryKey: workItemsKey,
    queryFn: async () => {
      const res = await getWorkItems(
        user!.id,
        selectedOrgId,
        currentPage,
        ITEMS_PER_PAGE,
        activeTab === 'all' ? undefined : activeTab, // Server-side status filter
      );
      return {
        data: res.data ?? [],
        meta: res.meta,
      };
    },
    enabled: !!user && view === 'table',
  });

  // Items are already filtered by server for non-'all' tabs
  const itemsResponse = (paginatedResponse?.data as WorkItem[]) ?? [];

  // Stats query - lightweight endpoint for stats bar
  const statsKey = ['workItemsStats', selectedOrgId ?? user?.id] as const;
  const { data: statsResponse } = useQuery({
    queryKey: statsKey,
    queryFn: async () => {
      const res = await getWorkItemStats(user!.id, selectedOrgId);
      return res.data as WorkItemStats;
    },
    enabled: !!user,
  });
  const workItemStats = statsResponse ?? null;

  // Pagination metadata from server (already filtered by status when applicable)
  const totalPages = paginatedResponse?.meta?.totalPages ?? 1;
  const totalCount = paginatedResponse?.meta?.totalCount ?? 0;

  const commentsKey = ['comments', detailItem?.id] as const;

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: commentsKey,
    queryFn: async () => {
      const res = await getWorkItemComments(user!.id, detailItem!.id);
      return res.data as WorkItemComment[];
    },
    enabled: !!user && !!detailItem,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      createWorkItem(user!.id, payload, selectedOrgId),
    onSuccess: (res) => {
      const newItem = res.data as WorkItem;
      toast.success('Work item created');
      setForm(emptyForm);
      setDialogOpen(false);
      // Optimistic: add to kanban state
      if (newItem) {
        const status = newItem.status;
        setKanbanState((prev) => ({
          ...prev,
          [status]: {
            ...prev[status],
            items: [newItem, ...prev[status].items],
          },
        }));
        // Also add to table cache for page 1 (current page 1 will show the new item)
        queryClient.setQueryData<{
          data: WorkItem[];
          meta?: { totalPages?: number; totalCount?: number };
        }>(['workItems', selectedOrgId ?? user?.id, 1], (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [newItem, ...old.data],
            meta: {
              ...old.meta,
              totalCount: (old.meta?.totalCount ?? 0) + 1,
            },
          };
        });
        // Invalidate stats to refresh counts
        void queryClient.invalidateQueries({ queryKey: statsKey });
      }
    },
    onError: () => toast.error('Could not create work item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<ReturnType<typeof buildPayload>>;
    }) => updateWorkItem(user!.id, id, payload, selectedOrgId),
    onSuccess: (res) => {
      const updated = res.data as WorkItem;
      setDetailItem((current) =>
        current?.id === updated.id ? updated : current,
      );
      setDetailMode('view');
      toast.success('Work item updated');
      void queryClient.invalidateQueries({ queryKey: workItemsKey });
      void queryClient.invalidateQueries({ queryKey: statsKey });
    },
    onError: (err) => {
      console.error('updateMutation error:', err);
      toast.error('Could not update work item');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkItemStatus }) =>
      updateWorkItem(user!.id, id, { status }, selectedOrgId),
    onSuccess: (res) => {
      const updated = res.data as WorkItem;
      setDetailItem((current) =>
        current?.id === updated.id ? updated : current,
      );
      void queryClient.invalidateQueries({ queryKey: workItemsKey });
      void queryClient.invalidateQueries({ queryKey: statsKey });
    },
    onError: (err) => {
      console.error('statusMutation error:', err);
      toast.error('Could not update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkItem(user!.id, id, selectedOrgId),
    onSuccess: (_res, id) => {
      setDetailItem((current) => (current?.id === id ? null : current));
      // Clear pending refs - item already removed from UI optimistically
      pendingDeleteRef.current = null;
      pendingDeleteItemRef.current = null;
      // Invalidate stats to refresh counts
      void queryClient.invalidateQueries({ queryKey: statsKey });
    },
    onError: (_err) => {
      toast.error('Could not delete work item');
      // On error, invalidate to restore correct state for current org
      void queryClient.invalidateQueries({
        queryKey: ['workItems', selectedOrgId ?? user?.id],
      });
      void queryClient.invalidateQueries({ queryKey: statsKey });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (body: string) =>
      createWorkItemComment(user!.id, detailItem!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      setCommentBody('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Could not add comment'),
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      updateWorkItemComment(user!.id, detailItem!.id, id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      setEditingComment(null);
      toast.success('Comment updated');
    },
    onError: () => toast.error('Could not update comment'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) =>
      deleteWorkItemComment(user!.id, detailItem!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
    },
    onError: () => toast.error('Could not delete comment'),
  });

  const requestCommentDelete = (target: WorkItemComment) => {
    setCommentDeleteTarget(null);
    queryClient.setQueryData<WorkItemComment[]>(commentsKey, (old = []) =>
      old.filter((c) => c.id !== target.id),
    );
    pendingCommentDeleteRef.current = target.id;
    deleteCommentFnRef.current = (id: string) =>
      deleteCommentMutation.mutate(id);
    const timer = setTimeout(() => {
      deleteCommentMutation.mutate(target.id);
      pendingCommentDeleteRef.current = null;
    }, 5000);
    toast('Comment deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timer);
          pendingCommentDeleteRef.current = null;
          queryClient.invalidateQueries({ queryKey: commentsKey });
          toast.dismiss();
        },
      },
      duration: 5000,
    });
  };

  const kanbanInitialLoading = useMemo(
    () =>
      STATUSES.some(
        (s) => kanbanState[s].loading && kanbanState[s].items.length === 0,
      ),
    [STATUSES, kanbanState],
  );

  const buildPayload = (includeEmptyFields = false) => ({
    title: form.title.trim(),
    description: form.description.trim() || '',
    status: form.status,
    priority: form.priority,
    dueDate: form.dueDate
      ? formatDateValue(form.dueDate)
      : includeEmptyFields
        ? null
        : undefined,
    assigneeId: form.assigneeId || (includeEmptyFields ? null : undefined),
  });

  const openCreateDialog = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openDetails = useCallback((item: WorkItem) => {
    setDetailItem(item);
    setDetailMode('view');
    setCommentBody('');
  }, []);

  const openEditDrawer = useCallback((item: WorkItem) => {
    setDetailItem(item);
    setDetailMode('edit');
    setForm(toWorkItemForm(item));
    setCommentBody('');
  }, []);

  const startDetailEdit = () => {
    if (!detailItem) return;
    setForm(toWorkItemForm(detailItem));
    setDetailMode('edit');
  };

  const cancelDetailEdit = () => {
    if (detailItem) setForm(toWorkItemForm(detailItem));
    setDetailMode('view');
  };

  const handleCreateSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user || !form.title.trim()) return;
    createMutation.mutate(buildPayload());
  };

  const saveDetailItem = () => {
    if (!user || !detailItem) return;
    if (!form.title.trim()) {
      detailTitleRef.current?.reportValidity();
      return;
    }
    updateMutation.mutate({ id: detailItem.id, payload: buildPayload(true) });
  };

  const handleDetailSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveDetailItem();
  };

  const handleStatusChange = (item: WorkItem, status: WorkItemStatus) => {
    if (!user) return;
    statusMutation.mutate({ id: item.id, status });
  };

  const handleStatusReorder = useCallback(
    (item: WorkItem, status: WorkItemStatus, orderedItems: WorkItem[]) => {
      if (!user) return;
      setKanbanState((prev) => ({
        todo: {
          ...prev.todo,
          items: orderedItems.filter((i) => i.status === 'todo'),
        },
        in_progress: {
          ...prev.in_progress,
          items: orderedItems.filter((i) => i.status === 'in_progress'),
        },
        done: {
          ...prev.done,
          items: orderedItems.filter((i) => i.status === 'done'),
        },
      }));
      statusMutation.mutate({ id: item.id, status });
      void reorderWorkItems(
        user.id,
        orderedItems.map((i, idx) => ({ id: i.id, position: idx })),
        selectedOrgId,
      );
    },
    [user, selectedOrgId, statusMutation],
  );

  const loadKanbanItems = useCallback(
    async (targetPage: number, status: WorkItemStatus, append = false) => {
      if (!user) return;

      setKanbanState((prev) => ({
        ...prev,
        [status]: { ...prev[status], loading: true },
      }));

      try {
        const res = await getWorkItems(
          user.id,
          selectedOrgId,
          targetPage,
          ITEMS_PER_PAGE,
          status,
        );
        const newItems = (res.data ?? []) as WorkItem[];
        const totalPages = res.meta?.totalPages ?? 1;
        const moreAvailable =
          newItems.length === ITEMS_PER_PAGE && totalPages > targetPage;

        setKanbanState((prev) => {
          const current = prev[status];
          const items = append
            ? [
                ...current.items,
                ...newItems.filter(
                  (i) => !current.items.some((e) => e.id === i.id),
                ),
              ]
            : newItems;
          return {
            ...prev,
            [status]: {
              ...current,
              items,
              page: targetPage,
              hasMore: moreAvailable,
              loading: false,
              error: false,
            },
          };
        });
      } catch {
        setLoadKanbanItemsError(true);
        setKanbanState((prev) => ({
          ...prev,
          [status]: {
            ...prev[status],
            loading: false,
            error: true,
            hasMore: false,
          },
        }));
      }
    },
    [user, selectedOrgId],
  );

  const loadAllKanbanItems = useCallback(() => {
    STATUSES.forEach((status) => {
      loadKanbanItems(1, status, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKanbanItems]);

  const handleRetryFetch = () => {
    setLoadKanbanItemsError(false);
    if (view === 'table') {
      refetch();
    } else {
      loadAllKanbanItems();
    }
  };

  const handleKanbanLoadMore = useCallback(
    (status: WorkItemStatus) =>
      loadKanbanItems(kanbanState[status].page + 1, status, true),
    [kanbanState, loadKanbanItems],
  );

  // Reset kanban items when org context changes
  useEffect(() => resetKanbanState(), [selectedOrgId]);

  // Load initial Kanban data when switching to Kanban view
  useEffect(() => {
    if (view !== 'kanban' || !user) return;
    loadAllKanbanItems();
  }, [view, selectedOrgId, loadAllKanbanItems, loadKanbanItems, user]);

  const submitComment = () => {
    if (!commentBody.trim()) return;
    addCommentMutation.mutate(commentBody.trim());
  };

  const saveCommentEdit = () => {
    if (!editingComment?.body.trim()) return;
    updateCommentMutation.mutate({
      id: editingComment.id,
      body: editingComment.body.trim(),
    });
  };

  const confirmDeleteComment = () => {
    if (!commentDeleteTarget) return;
    requestCommentDelete(commentDeleteTarget);
  };

  const requestDelete = useCallback(
    (target: WorkItem) => {
      setDeleteTarget(null);
      if (target.id === detailItem?.id) {
        setDetailItem(null);
        setDetailMode('view');
      }
      // Optimistic: remove from UI immediately
      const status = target.status;
      setKanbanState((prev) => ({
        ...prev,
        [status]: {
          ...prev[status],
          items: prev[status].items.filter((i) => i.id !== target.id),
        },
      }));
      // Also remove from table cache for current org
      queryClient.setQueriesData<{
        data: WorkItem[];
        meta?: { totalPages?: number; totalCount?: number };
      }>({ queryKey: ['workItems', selectedOrgId ?? user?.id] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((i) => i.id !== target.id),
          meta: {
            ...old.meta,
            totalCount: Math.max((old.meta?.totalCount ?? 1) - 1, 0),
          },
        };
      });
      pendingDeleteRef.current = target.id;
      pendingDeleteItemRef.current = target;
      deleteFnRef.current = (id: string) => deleteMutation.mutate(id);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      const timer = setTimeout(() => {
        deleteMutation.mutate(target.id);
        undoTimerRef.current = null;
        pendingDeleteRef.current = null;
        pendingDeleteItemRef.current = null;
      }, 5000);
      undoTimerRef.current = timer;
      toast('Work item deleted', {
        action: {
          label: 'Undo',
          onClick: () => {
            clearTimeout(timer);
            undoTimerRef.current = null;
            pendingDeleteRef.current = null;
            // Restore item to UI
            const item = pendingDeleteItemRef.current;
            if (item) {
              const itemStatus = item.status;
              setKanbanState((prev) => ({
                ...prev,
                [itemStatus]: {
                  ...prev[itemStatus],
                  items: [item, ...prev[itemStatus].items],
                },
              }));
              // Also restore to table cache
              queryClient.setQueriesData<{
                data: WorkItem[];
                meta?: { totalPages?: number; totalCount?: number };
              }>(
                { queryKey: ['workItems', selectedOrgId ?? user?.id] },
                (old) => {
                  if (!old) return old;
                  return {
                    ...old,
                    data: [item, ...old.data],
                    meta: {
                      ...old.meta,
                      totalCount: (old.meta?.totalCount ?? 0) + 1,
                    },
                  };
                },
              );
              pendingDeleteItemRef.current = null;
            }
            toast.dismiss();
          },
        },
        duration: 5000,
      });
    },
    [detailItem?.id, selectedOrgId, user?.id, deleteMutation, queryClient],
  );

  const kanbanItems = useMemo(
    () => [
      ...kanbanState.todo.items,
      ...kanbanState.in_progress.items,
      ...kanbanState.done.items,
    ],
    [
      kanbanState.todo.items,
      kanbanState.in_progress.items,
      kanbanState.done.items,
    ],
  );

  const kanbanPagination = useMemo(
    () => ({
      todo: {
        page: kanbanState.todo.page,
        hasMore: kanbanState.todo.hasMore,
        loading: kanbanState.todo.loading,
        error: kanbanState.todo.error,
      },
      in_progress: {
        page: kanbanState.in_progress.page,
        hasMore: kanbanState.in_progress.hasMore,
        loading: kanbanState.in_progress.loading,
        error: kanbanState.in_progress.error,
      },
      done: {
        page: kanbanState.done.page,
        hasMore: kanbanState.done.hasMore,
        loading: kanbanState.done.loading,
        error: kanbanState.done.error,
      },
    }),
    [
      kanbanState.todo.page,
      kanbanState.todo.hasMore,
      kanbanState.todo.loading,
      kanbanState.todo.error,
      kanbanState.in_progress.page,
      kanbanState.in_progress.hasMore,
      kanbanState.in_progress.loading,
      kanbanState.in_progress.error,
      kanbanState.done.page,
      kanbanState.done.hasMore,
      kanbanState.done.loading,
      kanbanState.done.error,
    ],
  );

  const handleKanbanDelete = useCallback(
    (item: WorkItem) => {
      if (preferences.confirmDestructiveActions) {
        setDeleteTarget(item);
      } else {
        requestDelete(item);
      }
    },
    [preferences.confirmDestructiveActions, requestDelete],
  );

  const handleKanbanReorder = useCallback(
    (ordered: WorkItem[]) => {
      if (!user) return;
      const status = ordered[0]?.status;
      if (status) {
        setKanbanState((prev) => ({
          ...prev,
          [status]: {
            ...prev[status],
            items: ordered.filter((i) => i.status === status),
          },
        }));
      }
      void reorderWorkItems(
        user.id,
        ordered.map((item, idx) => ({ id: item.id, position: idx })),
        selectedOrgId,
      );
    },
    [user, selectedOrgId],
  );

  const confirmDelete = () => {
    if (!deleteTarget) return;
    requestDelete(deleteTarget);
  };

  const requestDeleteFromDetails = () => {
    if (!detailItem) return;
    setDeleteTarget(detailItem);
  };

  const isDirty = useMemo(() => {
    if (!detailItem || detailMode !== 'edit') return false;
    const original = toWorkItemForm(detailItem);
    return (
      form.title !== original.title ||
      form.description !== original.description ||
      form.status !== original.status ||
      form.priority !== original.priority ||
      form.dueDate?.getTime() !== original.dueDate?.getTime() ||
      form.assigneeId !== original.assigneeId
    );
  }, [detailItem, detailMode, form]);

  if (!user) return null;

  return (
    <PageShell
      title="Workspace"
      description="Plan work, track progress, and manage shared project state"
      fullHeight
      actions={
        <>
          {organizations.length > 0 && (
            <Select
              value={selectedOrgId ?? '__personal__'}
              onValueChange={(v) => {
                setContext(v === '__personal__' ? undefined : v);
                setDetailItem(null);
                setDetailMode('view');
              }}
            >
              <SelectTrigger
                className="min-w-0 flex-1 sm:max-w-64 [&>span]:truncate [&>span]:overflow-hidden"
                data-onboarding="workspace-context"
              >
                <SelectValue placeholder="Context" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Scope</SelectLabel>
                  <SelectItem value="__personal__">Personal</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            onClick={() => {
              // Flush pending undo-deletes before refreshing so nothing is silently lost.
              if (undoTimerRef.current && pendingDeleteRef.current) {
                clearTimeout(undoTimerRef.current);
                undoTimerRef.current = null;
                deleteFnRef.current(pendingDeleteRef.current);
                pendingDeleteRef.current = null;
                pendingDeleteItemRef.current = null;
              }
              if (pendingCommentDeleteRef.current) {
                deleteCommentFnRef.current(pendingCommentDeleteRef.current);
                pendingCommentDeleteRef.current = null;
              }
              toast.dismiss();
              void queryClient.invalidateQueries({ queryKey: workItemsKey });
              // Reset kanban state and reload
              resetKanbanState();
              if (view === 'kanban') {
                loadAllKanbanItems();
              }
            }}
          >
            <RefreshCw />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus />
            New item
          </Button>
        </>
      }
    >
      <WorkItemStatsBar stats={workItemStats} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Work items</CardTitle>
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={view === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => updateView('table')}
              >
                <Table2 className="size-4 mr-1" />
                Table
              </Button>
              <Button
                variant={view === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => updateView('kanban')}
              >
                <LayoutGrid className="size-4 mr-1" />
                Kanban
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError || loadKanbanItemsError ? (
            <ApiErrorAlert
              title="Failed to load work items"
              description="Could not fetch work items. Please try again."
              onRetry={handleRetryFetch}
            />
          ) : (view === 'table' ? loading : kanbanInitialLoading) ? (
            <LoadingSpinner />
          ) : workItemStats?.total === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Workflow />
                </EmptyMedia>
                <EmptyTitle>Create your first work item</EmptyTitle>
                <EmptyDescription>
                  Work items demonstrate task tracking, workflow state, and
                  persistent backend data.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={openCreateDialog}>
                  <Plus />
                  New item
                </Button>
              </EmptyContent>
            </Empty>
          ) : view === 'table' ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as typeof activeTab);
                setPages((prev) => ({ ...prev, [v]: 1 }));
              }}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="todo">To do</TabsTrigger>
                <TabsTrigger value="in_progress">In progress</TabsTrigger>
                <TabsTrigger value="done">Done</TabsTrigger>
              </TabsList>
              <TabsContent value={activeTab}>
                <WorkItemsTable
                  items={itemsResponse}
                  totalCount={totalCount}
                  onStatusChange={handleStatusChange}
                  onDone={(item) => handleStatusChange(item, 'done')}
                  onEdit={openEditDrawer}
                  onDelete={(item) => {
                    if (preferences.confirmDestructiveActions) {
                      setDeleteTarget(item);
                    } else {
                      requestDelete(item);
                    }
                  }}
                  onOpenDetails={openDetails}
                  page={pages[activeTab]}
                  totalPages={totalPages}
                  onPageChange={(p) =>
                    setPages((prev) => ({ ...prev, [activeTab]: p }))
                  }
                />
              </TabsContent>
            </Tabs>
          ) : (
            <KanbanBoard
              items={kanbanItems}
              pagination={kanbanPagination}
              onEdit={openEditDrawer}
              onDelete={handleKanbanDelete}
              onOpenDetails={openDetails}
              onReorder={handleKanbanReorder}
              onStatusReorder={handleStatusReorder}
              onLoadMore={handleKanbanLoadMore}
            />
          )}
        </CardContent>
      </Card>

      <WorkItemFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        orgMembers={orgMembers}
        isPending={createMutation.isPending}
        onSubmit={handleCreateSubmit}
      />

      <WorkItemDetailDrawer
        detailItem={detailItem}
        detailMode={detailMode}
        setDetailItem={setDetailItem}
        setDetailMode={setDetailMode}
        form={form}
        setForm={setForm}
        detailTitleRef={detailTitleRef}
        comments={comments}
        commentsLoading={commentsLoading}
        commentBody={commentBody}
        setCommentBody={setCommentBody}
        editingComment={editingComment}
        setEditingComment={setEditingComment}
        orgMembers={orgMembers}
        currentUserId={user.id}
        confirmDestructiveActions={preferences.confirmDestructiveActions}
        updateIsPending={updateMutation.isPending}
        addCommentIsPending={addCommentMutation.isPending}
        isDirty={isDirty}
        onSave={saveDetailItem}
        onDetailSubmit={handleDetailSubmit}
        onStartEdit={startDetailEdit}
        onCancelEdit={cancelDetailEdit}
        onStatusChange={handleStatusChange}
        onRequestDelete={requestDeleteFromDetails}
        onSubmitComment={submitComment}
        onSaveCommentEdit={saveCommentEdit}
        onRequestCommentDelete={(comment: WorkItemComment) => {
          if (preferences.confirmDestructiveActions) {
            setCommentDeleteTarget(comment);
          } else {
            requestCommentDelete(comment);
          }
        }}
        onProfileClick={setProfileUserId}
      />

      <ResponsiveModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete work item?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              This removes the item from the database.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={Boolean(commentDeleteTarget)}
        onOpenChange={(open) => !open && setCommentDeleteTarget(null)}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete comment?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              This action cannot be undone.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button variant="destructive" onClick={confirmDeleteComment}>
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <UserProfileDrawer
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onMessage={(id) => navigate(`/chat?peer=${id}`)}
        onLocate={(id) => navigate(`/map?user=${id}`)}
        currentUserId={user?.id}
      />
    </PageShell>
  );
}
