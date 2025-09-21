import { formatDistanceToNow } from 'date-fns';
import {
  Building2,
  CheckCircle2,
  FilePlus,
  MessageSquare,
  Pencil,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ApiErrorAlert } from '@/components/ApiErrorAlert';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { getActivities, type Activity, type ActivityType } from '@/utils/api';

const activityIcons: Record<ActivityType, typeof FilePlus> = {
  comment_created: MessageSquare,
  comment_deleted: MessageSquare,
  organization_created: Building2,
  organization_updated: Pencil,
  organization_deleted: Trash2,
  organization_member_added: Users,
  work_item_created: FilePlus,
  work_item_updated: Pencil,
  work_item_deleted: Trash2,
  work_item_status_changed: CheckCircle2,
  profile_updated: User,
  user_login: User,
};

const activityColors: Record<ActivityType, string> = {
  comment_created: 'text-cyan-500',
  comment_deleted: 'text-red-500',
  organization_created: 'text-emerald-500',
  organization_updated: 'text-blue-500',
  organization_deleted: 'text-red-500',
  organization_member_added: 'text-indigo-500',
  work_item_created: 'text-emerald-500',
  work_item_updated: 'text-blue-500',
  work_item_deleted: 'text-red-500',
  work_item_status_changed: 'text-amber-500',
  profile_updated: 'text-purple-500',
  user_login: 'text-slate-500',
};

const parseActivityDate = (value: string) => {
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
};

const ITEMS_PER_PAGE = 10;

type LoadState =
  | { type: 'idle' }
  | { type: 'loading'; page: number }
  | { type: 'loadingMore'; page: number }
  | { type: 'error' }
  | { type: 'success'; page: number; hasMore: boolean };

export default function ActivityLog({
  organizationId,
}: {
  organizationId?: string;
} = {}) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [state, setState] = useState<LoadState>({ type: 'idle' });

  const stateRef = useRef<LoadState>({ type: 'idle' });
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadFnRef = useRef<((page: number, append: boolean) => void) | null>(
    null,
  );

  const getPageFromState = (s: LoadState): number => {
    if (s.type === 'loading' || s.type === 'loadingMore') return s.page;
    if (s.type === 'success') return s.page;
    return 1;
  };

  const loadActivities = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!user) return;

      setState(
        append
          ? { type: 'loadingMore', page: targetPage }
          : { type: 'loading', page: targetPage },
      );

      try {
        const res = await getActivities(
          user.id,
          targetPage,
          ITEMS_PER_PAGE,
          organizationId,
        );
        const newActivities = res.data ?? [];
        const totalPages = res.meta?.totalPages ?? 1;
        const moreAvailable =
          newActivities.length === ITEMS_PER_PAGE && totalPages > targetPage;

        setActivities((prev) =>
          append ? [...prev, ...newActivities] : newActivities,
        );
        setState({ type: 'success', page: targetPage, hasMore: moreAvailable });
      } catch {
        toast.error('Could not load activity log');
        setState({ type: 'error' });
      }
    },
    [user, organizationId],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    loadFnRef.current = loadActivities;
  });

  useEffect(() => {
    if (!user) return;
    setActivities([]);
    setState({ type: 'idle' });
    loadActivities(1, false);
  }, [user, organizationId, loadActivities]);

  useEffect(() => {
    const hasMoreData = state.type === 'success' ? state.hasMore : true;
    if (!hasMoreData) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const viewport = document.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );

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

        const nextPage = getPageFromState(currentState) + 1;
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
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pr-1">
        {isInitialLoading ? (
          <Skeleton className="h-16 mr-3" />
        ) : isError ? (
          <div className="pr-3">
            <ApiErrorAlert
              title="Failed to load activities"
              description="Could not fetch activity log. Please try again."
              onRetry={() => loadActivities(1, false)}
            />
          </div>
        ) : activities.length ? (
          <ScrollArea className="h-[calc(100vh-28.2rem)] pr-3">
            <ItemGroup>
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type];
                const colorClass = activityColors[activity.type];
                return (
                  <Item key={activity.id} variant="outline">
                    <ItemMedia variant="icon">
                      <Icon className={`size-4 ${colorClass}`} />
                    </ItemMedia>
                    <ItemContent className="overflow-hidden">
                      <ItemTitle>{activity.description}</ItemTitle>
                      <ItemDescription>
                        {formatDistanceToNow(
                          parseActivityDate(activity.createdAt),
                          { addSuffix: true },
                        )}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                );
              })}
              {isLoadingMore && (
                <div className="flex h-10 items-center justify-center">
                  <LoadingSpinner size={20} />
                </div>
              )}
              {hasMore && <div ref={sentinelRef} className="h-4" />}
            </ItemGroup>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        )}
      </CardContent>
    </Card>
  );
}
