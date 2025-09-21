import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiErrorAlert } from '@/components/ApiErrorAlert';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { getWorkItems, type WorkItem } from '@/utils/api';

const PER_PAGE = 10;

type State =
  | { type: 'idle' }
  | { type: 'loading'; page: number }
  | { type: 'loadingMore'; page: number }
  | { type: 'error' }
  | { type: 'success'; page: number; hasMore: boolean };

const getPage = (s: State): number => {
  if (s.type === 'loading' || s.type === 'loadingMore') return s.page;
  if (s.type === 'success') return s.page;
  return 1;
};

export default function NextUp({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [state, setState] = useState<State>({ type: 'idle' });
  const stateRef = useRef<State>({ type: 'idle' });
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadFnRef = useRef<((page: number, append: boolean) => void) | null>(
    null,
  );

  const load = useCallback(
    async (targetPage: number, append = false) => {
      if (!user) return;

      setState(
        append
          ? { type: 'loadingMore', page: targetPage }
          : { type: 'loading', page: targetPage },
      );

      try {
        const res = await getWorkItems(
          user.id,
          organizationId,
          targetPage,
          PER_PAGE,
          'todo,in_progress',
        );
        const newItems = res.data ?? [];
        const totalPages = res.meta?.totalPages ?? 1;
        const moreAvailable =
          newItems.length === PER_PAGE && totalPages > targetPage;

        setItems((prev) => (append ? [...prev, ...newItems] : newItems));
        setState({ type: 'success', page: targetPage, hasMore: moreAvailable });
      } catch {
        toast.error('Could not load work items');
        setState({ type: 'error' });
      }
    },
    [user, organizationId],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    loadFnRef.current = load;
  });

  useEffect(() => {
    if (!user) return;
    setItems([]);
    setState({ type: 'idle' });
    load(1, false);
  }, [user, organizationId, load]);

  useEffect(() => {
    const hasMoreData = state.type === 'success' ? state.hasMore : true;
    if (!hasMoreData) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const viewport = sentinel.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const currentState = stateRef.current;

        if (!entry.isIntersecting) return;
        if (
          currentState.type === 'loading' ||
          currentState.type === 'loadingMore'
        )
          return;
        if (currentState.type === 'success' && !currentState.hasMore) return;

        const nextPage = getPage(currentState) + 1;
        loadFnRef.current?.(nextPage, true);
      },
      { root: viewport, rootMargin: '100px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [state]);

  const isInitialLoading = state.type === 'loading' && state.page === 1;
  const isLoadingMore = state.type === 'loadingMore';
  const isError = state.type === 'error';
  const hasMore = state.type === 'success' ? state.hasMore : true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          Next up
          <Button asChild variant="ghost" size="sm">
            <Link to="/workspace">Open workspace</Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pr-1">
        {isInitialLoading ? (
          <Skeleton className="h-16 mr-3" />
        ) : isError ? (
          <div className="pr-3">
            <ApiErrorAlert
              title="Failed to load work items"
              description="Could not fetch work items. Please try again."
              onRetry={() => load(1, false)}
            />
          </div>
        ) : items.length ? (
          <ScrollArea className="h-[calc(100vh-28.2rem)] pr-3">
            <ItemGroup>
              {items.map((item) => (
                <Item key={item.id} variant="outline">
                  <ItemContent>
                    <ItemTitle>{item.title}</ItemTitle>
                    <ItemDescription>
                      {item.dueDate ?? 'No due date'}
                      {item.assignee && (
                        <span className="ml-2">
                          · {item.assignee.displayName ?? item.assignee.email}
                        </span>
                      )}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge
                      variant={
                        item.priority === 'high' ? 'default' : 'secondary'
                      }
                    >
                      {item.priority}
                    </Badge>
                  </ItemActions>
                </Item>
              ))}
              {isLoadingMore && (
                <div className="flex h-10 items-center justify-center">
                  <LoadingSpinner size={20} />
                </div>
              )}
              {hasMore && <div ref={sentinelRef} className="h-4" />}
            </ItemGroup>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">No open work items.</p>
        )}
      </CardContent>
    </Card>
  );
}
