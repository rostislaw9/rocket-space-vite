import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import type { Dispatch, RefObject, SetStateAction } from 'react';

import LoadingSpinner from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from '@/components/UserAvatar';
import type {
  OrganizationMember,
  WorkItem,
  WorkItemComment,
  WorkItemPriority,
  WorkItemStatus,
} from '@/utils/api';

import {
  priorityLabels,
  statusLabels,
  type WorkItemFormState,
} from './constants';
import DueDatePicker from './DueDatePicker';

interface WorkItemDetailDrawerProps {
  detailItem: WorkItem | null;
  detailMode: 'view' | 'edit';
  setDetailItem: Dispatch<SetStateAction<WorkItem | null>>;
  setDetailMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  form: WorkItemFormState;
  setForm: Dispatch<SetStateAction<WorkItemFormState>>;
  detailTitleRef: RefObject<HTMLInputElement | null>;
  comments: WorkItemComment[];
  commentsLoading: boolean;
  commentBody: string;
  setCommentBody: Dispatch<SetStateAction<string>>;
  editingComment: { id: string; body: string } | null;
  setEditingComment: Dispatch<
    SetStateAction<{ id: string; body: string } | null>
  >;
  orgMembers: OrganizationMember[];
  currentUserId: string;
  confirmDestructiveActions: boolean;
  updateIsPending: boolean;
  addCommentIsPending: boolean;
  isDirty?: boolean;
  onSave: () => void;
  onDetailSubmit: (e: React.FormEvent) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onStatusChange: (item: WorkItem, status: WorkItemStatus) => void;
  onRequestDelete: () => void;
  onSubmitComment: () => void;
  onSaveCommentEdit: () => void;
  onRequestCommentDelete: (comment: WorkItemComment) => void;
  onProfileClick: (userId: string) => void;
}

export default function WorkItemDetailDrawer({
  detailItem,
  detailMode,
  setDetailItem,
  setDetailMode,
  form,
  setForm,
  detailTitleRef,
  comments,
  commentsLoading,
  commentBody,
  setCommentBody,
  editingComment,
  setEditingComment,
  orgMembers,
  currentUserId,
  confirmDestructiveActions: _confirmDestructiveActions,
  updateIsPending,
  addCommentIsPending,
  isDirty = true,
  onSave,
  onDetailSubmit,
  onStartEdit,
  onCancelEdit,
  onStatusChange,
  onRequestDelete,
  onSubmitComment,
  onSaveCommentEdit,
  onRequestCommentDelete,
  onProfileClick,
}: WorkItemDetailDrawerProps) {
  return (
    <Drawer
      open={Boolean(detailItem)}
      onOpenChange={(open: boolean) => {
        if (!open) {
          setDetailItem(null);
          setDetailMode('view');
        }
      }}
    >
      <DrawerContent className="mx-auto max-w-4xl">
        {detailItem ? (
          <>
            <DrawerHeader>
              <DrawerTitle className="text-xl">
                {detailMode === 'edit' ? 'Edit work item' : detailItem.title}
              </DrawerTitle>
              <DrawerDescription>
                {detailMode === 'edit'
                  ? 'Update the work item without leaving the details drawer.'
                  : 'Work item details, comments, and quick actions.'}
              </DrawerDescription>
            </DrawerHeader>
            <Separator />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5 p-4 md:px-6 md:py-5">
                {detailMode === 'edit' ? (
                  <form
                    id="work-item-detail-form"
                    onSubmit={onDetailSubmit}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="detail-title">Title</Label>
                      <Input
                        id="detail-title"
                        ref={detailTitleRef}
                        value={form.title}
                        onChange={(e) =>
                          setForm((c: WorkItemFormState) => ({
                            ...c,
                            title: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detail-description">Description</Label>
                      <Textarea
                        id="detail-description"
                        value={form.description}
                        onChange={(e) =>
                          setForm((c: WorkItemFormState) => ({
                            ...c,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-10 gap-3">
                      <div className="col-span-3 min-w-0 space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={form.status}
                          onValueChange={(v: WorkItemStatus) =>
                            setForm((c: WorkItemFormState) => ({
                              ...c,
                              status: v,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Status</SelectLabel>
                              {Object.entries(statusLabels).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 min-w-0 space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={form.priority}
                          onValueChange={(v: WorkItemPriority) =>
                            setForm((c: WorkItemFormState) => ({
                              ...c,
                              priority: v,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Priority</SelectLabel>
                              {Object.entries(priorityLabels).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4 min-w-0 space-y-2">
                        <Label htmlFor="detail-dueDate">Due</Label>
                        <DueDatePicker
                          id="detail-dueDate"
                          value={form.dueDate}
                          onChange={(dueDate) =>
                            setForm((c: WorkItemFormState) => ({
                              ...c,
                              dueDate,
                            }))
                          }
                        />
                      </div>
                    </div>
                    {orgMembers.length > 0 && (
                      <div className="space-y-2">
                        <Label>Assignee</Label>
                        <Select
                          value={form.assigneeId || '__none__'}
                          onValueChange={(v) =>
                            setForm((c: WorkItemFormState) => ({
                              ...c,
                              assigneeId: v === '__none__' ? '' : v,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Assignee</SelectLabel>
                              <SelectItem value="__none__">
                                Unassigned
                              </SelectItem>
                              {orgMembers.map((m) => (
                                <SelectItem key={m.userId} value={m.userId}>
                                  {m.user?.displayName ??
                                    m.user?.email ??
                                    m.userId}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </form>
                ) : (
                  <>
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {statusLabels[detailItem.status]}
                        </Badge>
                        <Badge
                          variant={
                            detailItem.priority === 'high'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {priorityLabels[detailItem.priority]} priority
                        </Badge>
                      </div>
                    </div>

                    <section className="space-y-2 rounded-xl border bg-card p-4">
                      <h3 className="text-sm font-medium">Description</h3>
                      <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                        {detailItem.description || 'No description provided.'}
                      </p>
                    </section>

                    <section className="grid gap-3 text-sm md:grid-cols-3">
                      <div
                        className={`flex items-center justify-between gap-4 rounded-xl border bg-card p-4 ${
                          detailItem.assignee
                            ? 'cursor-pointer transition-colors hover:bg-muted/50'
                            : ''
                        }`}
                        onClick={() => {
                          if (detailItem.assignee?.id) {
                            onProfileClick(detailItem.assignee.id);
                          }
                        }}
                      >
                        <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                          <UserCircle2 className="size-4" />
                          Assignee
                        </span>
                        {detailItem.assignee ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <UserAvatar
                              src={detailItem.assignee.avatarUrl}
                              name={
                                detailItem.assignee.displayName ??
                                detailItem.assignee.email
                              }
                              className="size-5 shrink-0"
                            />
                            <span className="truncate font-medium">
                              {detailItem.assignee.displayName ??
                                detailItem.assignee.email}
                            </span>
                          </span>
                        ) : (
                          <span className="truncate font-medium">
                            Unassigned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="size-4" />
                          Due date
                        </span>
                        <span className="font-medium">
                          {detailItem.dueDate ?? 'No due date'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="size-4" />
                          Updated
                        </span>
                        <span className="font-medium">
                          {new Date(detailItem.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </section>
                  </>
                )}

                {detailMode === 'view' && (
                  <>
                    <Separator />
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium">Comments</h3>
                      </div>
                      <div className="space-y-2">
                        <Textarea
                          value={commentBody}
                          onChange={(e) => setCommentBody(e.target.value)}
                          placeholder="Add context for the next person..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              onSubmitComment();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={onSubmitComment}
                          disabled={addCommentIsPending || !commentBody.trim()}
                        >
                          <Send className="size-4" />
                          Add comment
                        </Button>
                      </div>
                      {commentsLoading ? (
                        <div className="flex h-32 items-center justify-center">
                          <LoadingSpinner size={32} />
                        </div>
                      ) : comments.length ? (
                        <div className="space-y-3">
                          {comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="rounded-lg border bg-background p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <button
                                  type="button"
                                  className="shrink-0 rounded-full"
                                  onClick={() =>
                                    onProfileClick(comment.authorId)
                                  }
                                  aria-label="View profile"
                                >
                                  <UserAvatar
                                    src={comment.author?.avatarUrl}
                                    name={
                                      comment.author?.displayName ??
                                      comment.author?.email ??
                                      '?'
                                    }
                                    className="size-8"
                                  />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">
                                    {comment.author?.displayName ??
                                      comment.author?.email ??
                                      'Comment'}
                                  </p>
                                  {editingComment?.id === comment.id ? (
                                    <div className="mt-2 space-y-2">
                                      <Textarea
                                        value={editingComment.body}
                                        onChange={(e) =>
                                          setEditingComment((c) =>
                                            c
                                              ? { ...c, body: e.target.value }
                                              : c,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === 'Enter' &&
                                            (e.metaKey || e.ctrlKey)
                                          ) {
                                            e.preventDefault();
                                            onSaveCommentEdit();
                                          }
                                          if (e.key === 'Escape')
                                            setEditingComment(null);
                                        }}
                                        autoFocus
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={onSaveCommentEdit}
                                          disabled={!editingComment.body.trim()}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            setEditingComment(null)
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                      {comment.body}
                                    </p>
                                  )}
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    {new Date(
                                      comment.createdAt,
                                    ).toLocaleString()}
                                  </p>
                                </div>
                                {comment.authorId === currentUserId &&
                                editingComment?.id !== comment.id ? (
                                  <div className="flex shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        setEditingComment({
                                          id: comment.id,
                                          body: comment.body,
                                        })
                                      }
                                      aria-label="Edit comment"
                                    >
                                      <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        onRequestCommentDelete(comment)
                                      }
                                      aria-label="Delete comment"
                                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                          No comments yet.
                        </p>
                      )}
                    </section>
                  </>
                )}
              </div>
            </div>
            <Separator />
            <DrawerFooter className="md:flex-row md:justify-end">
              {detailMode === 'edit' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={onSave}
                    disabled={!isDirty || updateIsPending}
                  >
                    Save changes
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onRequestDelete}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                  <Button type="button" variant="outline" onClick={onStartEdit}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  {detailItem.status !== 'done' && (
                    <Button
                      type="button"
                      onClick={() => onStatusChange(detailItem, 'done')}
                    >
                      <CheckCircle2 className="size-4" />
                      Mark done
                    </Button>
                  )}
                </>
              )}
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
