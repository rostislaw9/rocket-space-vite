import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Pencil,
  Settings,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import UserAvatar from '@/components/UserAvatar';
import UserProfileDrawer from '@/components/UserProfileDrawer';
import ActivityLog from '@/components/dashboard/ActivityLog';
import NextUp from '@/components/dashboard/NextUp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspaceContext } from '@/hooks/use-workspace-context';
import {
  getOrganizations,
  getWorkItemStats,
  type Organization,
  type WorkItemStats,
} from '@/utils/api';

const profileFields = [
  'displayName',
  'avatarUrl',
  'bio',
  'title',
  'company',
  'latitude',
] as const;

export default function DashBoardCanvasPage() {
  const { user, firebaseUser, loading } = useAuth();

  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { selectedOrgId, setContext, validateContext } = useWorkspaceContext();
  const navigate = useNavigate();

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

  const { data: workItemStats, isLoading: workItemsLoading } =
    useQuery<WorkItemStats>({
      queryKey: ['workItemsStats', selectedOrgId ?? user?.id],
      queryFn: async () => {
        const res = await getWorkItemStats(user!.id, selectedOrgId);
        return res.data as WorkItemStats;
      },
      enabled: !!user,
    });

  const doneItems = workItemStats?.done ?? 0;
  const openItems = workItemStats?.open ?? 0;
  const highPriority = workItemStats?.highPriority ?? 0;
  const totalItems = workItemStats?.total ?? 0;

  const completion = useMemo(() => {
    if (!user) return 0;
    const filled = profileFields.filter((field) => !!user[field]).length;
    return Math.round((filled / profileFields.length) * 100);
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  const avatarSrc = user.avatarUrl ?? firebaseUser?.photoURL ?? undefined;
  const displayName = user.displayName || 'New account';

  const handleContextChange = (v: string) => {
    setContext(v === '__personal__' ? undefined : v);
  };

  return (
    <PageShell
      title="Dashboard"
      description="A concise view of account and workspace activity"
      actions={
        organizations.length > 0 ? (
          <Select
            value={selectedOrgId ?? '__personal__'}
            onValueChange={handleContextChange}
          >
            <SelectTrigger
              className="max-w-64"
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
        ) : undefined
      }
    >
      <Card>
        <CardContent>
          <div className="flex flex-row items-start md:gap-4">
            <button
              type="button"
              onClick={() => setProfileUserId(user.id)}
              aria-label="View profile"
            >
              <UserAvatar
                src={avatarSrc}
                name={displayName}
                className="hidden md:flex size-16"
              />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 lg:flex-nowrap justify-between">
                <button
                  type="button"
                  className="block min-w-0 text-left"
                  onClick={() => setProfileUserId(user.id)}
                >
                  <p className="truncate text-xl font-semibold">
                    {displayName}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/profile">
                      <Pencil />
                      <span className="hidden lg:flex">Edit profile</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/settings">
                      <Settings />
                      <span className="hidden lg:flex">Settings</span>
                    </Link>
                  </Button>
                </div>
              </div>
              {(user.title || user.company) && (
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground lg:flex">
                  <BriefcaseBusiness className="size-4 shrink-0" />
                  {[user.title, user.company].filter(Boolean).join(' · ')}
                </p>
              )}
              {completion < 100 && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UserRound className="size-3" />
                      Profile completeness
                    </span>
                    <span>{completion}%</span>
                  </div>
                  <Progress value={completion} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total items</p>
              <p className="mt-0.5 text-xl font-semibold">
                {workItemsLoading ? '...' : totalItems}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="mt-0.5 flex items-center gap-1 text-xl font-semibold">
                {workItemsLoading ? '...' : openItems}
                {!workItemsLoading && openItems > 0 && (
                  <TrendingUp className="size-4 text-muted-foreground" />
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="mt-0.5 flex items-center gap-1 text-xl font-semibold">
                {workItemsLoading ? '...' : doneItems}
                {!workItemsLoading && doneItems > 0 && (
                  <CheckCircle2 className="size-4 text-muted-foreground" />
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">High priority</p>
              <p className="mt-0.5 flex items-center gap-1 text-xl font-semibold">
                {workItemsLoading ? '...' : highPriority}
                {!workItemsLoading && highPriority > 0 && (
                  <AlertTriangle className="size-4 text-amber-500" />
                )}
              </p>
            </div>
          </div>
        </CardFooter>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <ActivityLog organizationId={selectedOrgId} />
        <NextUp organizationId={selectedOrgId} />
      </section>

      <UserProfileDrawer
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onMessage={(id) => navigate(`/chat?peer=${id}`)}
        onLocate={(id) => navigate(`/map?user=${id}`)}
        currentUserId={user.id}
      />
    </PageShell>
  );
}
