/**
 * Comments Section Component
 *
 * Displays and manages comments for a work item.
 * Supports adding, editing, and deleting comments with optimistic updates.
 */
import { Pencil, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';

import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from '@/components/UserAvatar';
import type { UserProfile } from '@/contexts/auth-context';
import type { WorkItemComment } from '@/utils/api';

// Props for CommentsSection component
interface CommentsSectionProps {
  /** Array of comments to display */
  comments: WorkItemComment[];
  /** Whether comments are loading */
  isLoading: boolean;
  /** Current user for checking permissions */
  currentUser: UserProfile;
  /** Callback to add a new comment */
  onAddComment: (body: string) => void;
  /** Callback to update a comment */
  onUpdateComment: (id: string, body: string) => void;
  /** Callback to delete a comment */
  onDeleteComment: (comment: WorkItemComment) => void;
  /** Whether add operation is pending */
  isAddingComment: boolean;
  /** Whether update operation is pending */
  isUpdatingComment: boolean;
}

// Comments section with add, edit, and delete functionality
export function CommentsSection({
  comments,
  isLoading,
  currentUser,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  isAddingComment,
  isUpdatingComment,
}: CommentsSectionProps) {
  const [commentBody, setCommentBody] = useState('');
  const [editingComment, setEditingComment] = useState<{
    id: string;
    body: string;
  } | null>(null);

  // Submit new comment
  const handleSubmit = () => {
    if (!commentBody.trim()) return;
    onAddComment(commentBody.trim());
    setCommentBody('');
  };

  // Save edited comment
  const handleSaveEdit = () => {
    if (!editingComment?.body.trim()) return;
    onUpdateComment(editingComment.id, editingComment.body.trim());
    setEditingComment(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingComment(null);
  };

  // Start editing a comment
  const handleStartEdit = (comment: WorkItemComment) => {
    setEditingComment({ id: comment.id, body: comment.body });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b p-4">
        <Textarea
          value={commentBody}
          onChange={(event) => setCommentBody(event.target.value)}
          placeholder="Add context for the next person..."
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isAddingComment || !commentBody.trim()}
          >
            <Send className="mr-2 size-4" />
            {isAddingComment ? 'Sending...' : 'Comment'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <LoadingSpinner size={32} />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No comments yet. Be the first to add context!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border bg-background p-3"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      src={
                        comment.author?.avatarUrl ??
                        comment.author?.email?.charAt(0).toUpperCase()
                      }
                      name={
                        comment.author?.displayName ??
                        comment.author?.email ??
                        'Unknown'
                      }
                      className="h-8 w-8"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {comment.author?.displayName ??
                            comment.author?.email ??
                            'Unknown'}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {editingComment?.id === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            value={editingComment.body}
                            onChange={(e) =>
                              setEditingComment((c) =>
                                c ? { ...c, body: e.target.value } : c,
                              )
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === 'Enter' &&
                                (e.metaKey || e.ctrlKey)
                              ) {
                                e.preventDefault();
                                handleSaveEdit();
                              }
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="min-h-[80px]"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={
                                isUpdatingComment || !editingComment.body.trim()
                              }
                            >
                              {isUpdatingComment ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {comment.body}
                          </p>
                          {comment.authorId === currentUser.id && (
                            <div className="mt-2 flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(comment)}
                              >
                                <Pencil className="mr-1 size-3" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteComment(comment)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="mr-1 size-3" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default CommentsSection;
