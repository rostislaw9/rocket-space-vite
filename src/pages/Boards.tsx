import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LineSquiggle,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiErrorAlert } from '@/components/ApiErrorAlert';
import PageShell from '@/components/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import {
  createBoard,
  deleteBoard,
  getOrganizations,
  listBoards,
  updateBoard,
  type Board,
} from '@/utils/api';
import { getPaginationItems } from '@/utils/get-pagination-items';

type OrgItem = { id: string; name: string };

export default function BoardsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOrgId, setNewOrgId] = useState('__personal__');
  const [createOpen, setCreateOpen] = useState(false);

  const [editBoard, setEditBoard] = useState<Board | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [scopeTab, setScopeTab] = useState<'all' | 'personal' | 'shared'>(
    'all',
  );
  const ITEMS_PER_PAGE = 10;

  const {
    data: paginatedResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['boards', user?.id, page],
    queryFn: async () => {
      const res = await listBoards(user!.id, page, ITEMS_PER_PAGE);
      return {
        data: res.data ?? [],
        meta: res.meta,
      };
    },
    enabled: !!user,
  });

  const paginatedBoards = (paginatedResponse?.data as Board[]) ?? [];
  const totalPages = paginatedResponse?.meta?.totalPages ?? 1;
  const totalCount = paginatedResponse?.meta?.totalCount;
  const paginationItems = getPaginationItems(page, totalPages);

  const { data: organizations = [] } = useQuery<OrgItem[]>({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      const res = await getOrganizations(user!.id);
      return res.data as OrgItem[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createBoard(user!.id, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        organizationId: newOrgId === '__personal__' ? undefined : newOrgId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', user?.id] });
      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewOrgId('__personal__');
      toast.success('Board created');
    },
    onError: () => toast.error('Failed to create board'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateBoard(user!.id, editBoard!.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', user?.id] });
      setEditOpen(false);
      setEditBoard(null);
      toast.success('Board updated');
    },
    onError: () => toast.error('Failed to update board'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBoard(user!.id, deleteTarget!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', user?.id] });
      setDeleteOpen(false);
      setDeleteTarget(null);
      toast.success('Board deleted');
    },
    onError: () => toast.error('Failed to delete board'),
  });

  const openEdit = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditBoard(board);
    setEditTitle(board.title);
    setEditDesc(board.description ?? '');
    setEditOpen(true);
  };

  const openDelete = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(board);
    setDeleteOpen(true);
  };

  if (!user) return null;

  const orgName = (orgId?: string) =>
    organizations.find((o) => o.id === orgId)?.name;

  return (
    <PageShell
      title="Whiteboards"
      description="Collaborative whiteboards with real-time drawing"
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => {
              void queryClient.invalidateQueries({
                queryKey: ['organizations', user?.id],
              });
              void queryClient.invalidateQueries({
                queryKey: ['boards', user?.id],
              });
            }}
          >
            <RefreshCw />
            Refresh
          </Button>
          <ResponsiveModal open={createOpen} onOpenChange={setCreateOpen}>
            <ResponsiveModalTrigger asChild>
              <Button>
                <Plus className="size-4" />
                New board
              </Button>
            </ResponsiveModalTrigger>
            <ResponsiveModalContent showCloseButton={false}>
              <form
                id="create-board-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTitle.trim()) return;
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <ResponsiveModalHeader className="border-b md:border-0">
                  <ResponsiveModalTitle className="text-xl">
                    Create board
                  </ResponsiveModalTitle>
                  <ResponsiveModalDescription>
                    Set up a new collaborative whiteboard.
                  </ResponsiveModalDescription>
                </ResponsiveModalHeader>
                <div className="space-y-4 p-4 md:p-0">
                  <div className="space-y-2">
                    <Label htmlFor="new-title">Title</Label>
                    <Input
                      id="new-title"
                      placeholder="My whiteboard"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      maxLength={120}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-desc">
                      Description{' '}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="new-desc"
                      placeholder="What is this board for?"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                  {organizations.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="new-org">Scope</Label>
                      <Select value={newOrgId} onValueChange={setNewOrgId}>
                        <SelectTrigger id="new-org" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Scope</SelectLabel>
                            <SelectItem value="__personal__">
                              Personal
                            </SelectItem>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <ResponsiveModalFooter className="border-t md:border-t">
                  <ResponsiveModalClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </ResponsiveModalClose>
                  <Button
                    type="submit"
                    form="create-board-form"
                    disabled={!newTitle.trim() || createMutation.isPending}
                  >
                    Create
                  </Button>
                </ResponsiveModalFooter>
              </form>
            </ResponsiveModalContent>
          </ResponsiveModal>
        </>
      }
    >
      {isError ? (
        <ApiErrorAlert
          title="Failed to load boards"
          description="Could not fetch boards. Please try again."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <Skeleton className="h-15" />
      ) : totalCount === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LineSquiggle />
            </EmptyMedia>
            <EmptyTitle>Create your first board</EmptyTitle>
            <EmptyDescription>
              Boards demonstrate real-time collaboration, shared editing, and
              visual communication.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              New board
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card>
          <CardContent>
            <Tabs
              value={scopeTab}
              onValueChange={(v) => {
                setScopeTab(v as typeof scopeTab);
                setPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="shared">Shared</TabsTrigger>
              </TabsList>
              <TabsContent value={scopeTab}>
                {(() => {
                  const filtered =
                    scopeTab === 'personal'
                      ? paginatedBoards.filter((b) => !b.organizationId)
                      : scopeTab === 'shared'
                        ? paginatedBoards.filter((b) => !!b.organizationId)
                        : paginatedBoards;
                  return (
                    <div className="mt-4 overflow-x-auto rounded-lg border">
                      <Table className="min-w-[700px] table-fixed">
                        <colgroup>
                          <col className="w-[45%]" />
                          <col className="w-[25%]" />
                          <col className="w-[25%]" />
                          <col className="w-[5%]" />
                        </colgroup>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Members</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((board) => (
                            <TableRow
                              key={board.id}
                              className="cursor-pointer"
                              onClick={() => navigate(`/boards/${board.id}`)}
                            >
                              <TableCell>
                                <div className="truncate font-medium">
                                  {board.title}
                                </div>
                                {board.description ? (
                                  <div className="truncate text-xs text-muted-foreground">
                                    {board.description}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell>
                                {board.organizationId ? (
                                  <Badge variant="outline">
                                    {orgName(board.organizationId) ?? 'Org'}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Personal
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Users className="size-3.5" />
                                  {board.members?.length ?? 0}
                                </div>
                              </TableCell>
                              <TableCell>
                                {board.ownerId === user.id && (
                                  <div className="flex justify-end">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreHorizontal className="size-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={(e) => openEdit(board, e)}
                                        >
                                          <Pencil className="mr-2 size-4" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={(e) => openDelete(board, e)}
                                        >
                                          <Trash2 className="mr-2 size-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={1}>
                              <span className="text-xs text-muted-foreground">
                                {filtered.length} board
                                {filtered.length === 1 ? '' : 's'}
                                {totalPages > 1 && (
                                  <span className="ml-1">
                                    · Page {page} of {totalPages}
                                  </span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell colSpan={3}>
                              {totalPages > 1 && (
                                <Pagination className="justify-end">
                                  <PaginationContent>
                                    <PaginationPrevious
                                      onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                      }
                                      className={
                                        page <= 1
                                          ? 'pointer-events-none opacity-50'
                                          : 'cursor-pointer'
                                      }
                                    />
                                    {paginationItems.map((item, idx) => (
                                      <PaginationItem
                                        key={
                                          item === 'ellipsis'
                                            ? `ellipsis-${idx}`
                                            : item
                                        }
                                      >
                                        {item === 'ellipsis' ? (
                                          <PaginationEllipsis />
                                        ) : (
                                          <PaginationLink
                                            isActive={item === page}
                                            onClick={() => setPage(item)}
                                            className="cursor-pointer"
                                          >
                                            {item}
                                          </PaginationLink>
                                        )}
                                      </PaginationItem>
                                    ))}
                                    <PaginationNext
                                      onClick={() =>
                                        setPage((p) =>
                                          Math.min(totalPages, p + 1),
                                        )
                                      }
                                      className={
                                        page >= totalPages
                                          ? 'pointer-events-none opacity-50'
                                          : 'cursor-pointer'
                                      }
                                    />
                                  </PaginationContent>
                                </Pagination>
                              )}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <ResponsiveModal
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditBoard(null);
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <form
            id="edit-board-form"
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-4"
          >
            <ResponsiveModalHeader className="border-b md:border-0">
              <ResponsiveModalTitle className="text-xl">
                Edit board
              </ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Update the title or description of this board.
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <div className="space-y-4 p-4 md:p-0">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={120}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">
                  Description{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="edit-desc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>
            <ResponsiveModalFooter className="border-t md:border-t">
              <ResponsiveModalClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </ResponsiveModalClose>
              <Button
                type="submit"
                form="edit-board-form"
                disabled={!editTitle.trim() || updateMutation.isPending}
              >
                Save
              </Button>
            </ResponsiveModalFooter>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeleteTarget(null);
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader className="border-b md:border-0">
            <ResponsiveModalTitle className="text-xl">
              Delete board
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>
              ? This action cannot be undone.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </PageShell>
  );
}
