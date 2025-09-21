import {
  Activity,
  CheckCircle2,
  Crown,
  HeartPulse,
  LayoutDashboard,
  RefreshCw,
  Timer,
  Users,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import UserAvatar from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import {
  getAdminUserStats,
  getHealth,
  type AdminUserStats,
  type HealthPayload,
} from '@/utils/api';

export default function AdminPage() {
  useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(false);

  const loadUsers = async () => {
    try {
      const response = await getAdminUserStats();
      const data = response.data as { data?: AdminUserStats[] };
      setUsers(data.data ?? (response.data as AdminUserStats[]));
    } catch {
      toast.error('Could not load user stats');
    }
  };

  const loadHealth = () => {
    setHealth(null);
    setHealthLoading(true);
    setHealthError(false);
    getHealth()
      .then((res) => setHealth(res.data))
      .catch(() => {
        setHealthError(true);
        toast.error('Could not load health status');
      })
      .finally(() => {
        setHealthLoading(false);
      });
  };

  const loadAll = async () => {
    setLoading(true);
    await loadUsers();
    setLoading(false);
  };

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        await loadUsers();
        setIsAdmin(true);
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status !== 401 && status !== 403) {
          toast.error('Could not load admin data');
        }
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
    loadHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const totalWorkItems = users.reduce((sum, u) => sum + u.workItemCount, 0);
  const totalCompleted = users.reduce((sum, u) => sum + u.completedCount, 0);
  const avgCompletion =
    totalWorkItems > 0
      ? Math.round((totalCompleted / totalWorkItems) * 100)
      : 0;
  const adminCount = users.filter(({ user }) =>
    user.roles.includes('admin'),
  ).length;

  if (loading) return <LoadingSpinner />;
  if (isAdmin === false) return <Navigate to="/dashboard" replace />;

  return (
    <PageShell
      title="Admin"
      description="System overview and user management"
      actions={
        <Button variant="outline" onClick={loadAll} disabled={loading}>
          <RefreshCw />
          Refresh
        </Button>
      }
    >
      <section className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card className="p-1 md:p-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Users
                </p>
                <p className="text-lg lg:text-2xl font-semibold">
                  {users.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-1 md:p-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <LayoutDashboard className="size-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Total Tasks
                </p>
                <p className="text-lg lg:text-2xl font-semibold">
                  {totalWorkItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-1 md:p-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-500/10">
                <CheckCircle2 className="size-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Completed
                </p>
                <p className="text-lg lg:text-2xl font-semibold">
                  {totalCompleted}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-1 md:p-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-amber-500/10">
                <Activity className="size-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Completion
                </p>
                <p className="text-lg lg:text-2xl font-semibold">
                  {avgCompletion}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-1 md:p-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-purple-500/10">
                <Crown className="size-6 text-purple-500" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Admins
                </p>
                <p className="text-lg lg:text-2xl font-semibold">
                  {adminCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-1 md:p-2">
          <CardContent className="p-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-rose-500/10">
                  <HeartPulse className="size-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">
                    API Health
                  </p>
                  <div className="flex flex-col md:flex-row md:gap-2">
                    <div className="flex items-center gap-1.5">
                      {healthError || !health ? (
                        <XCircle className="size-4 text-destructive" />
                      ) : (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      )}
                      <p className="text-xs md:text-lg font-medium">
                        {health?.status ?? 'unknown'}
                      </p>
                    </div>
                    {health && !healthError && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Timer className="size-3" />
                        {formatUptime(health.uptime)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={loadHealth}
                disabled={healthLoading}
                className="shrink-0 -mt-1 -mr-1"
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Work Items</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(({ user, workItemCount, completedCount }) => {
                  const completion = workItemCount
                    ? Math.round((completedCount / workItemCount) * 100)
                    : 0;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={user.avatarUrl}
                            name={user.displayName ?? user.email}
                            className="size-8"
                          />
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {user.displayName ?? 'Unnamed'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={
                                role === 'admin' ? 'default' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{workItemCount}</TableCell>
                      <TableCell>
                        <div className="min-w-32 space-y-2">
                          <div className="flex justify-between gap-3 text-sm">
                            <span>
                              {completedCount}/{workItemCount}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {completion}%
                            </span>
                          </div>
                          <Progress value={completion} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
