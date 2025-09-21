import { AlertTriangle, ListTodo, TrendingUp } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { WorkItemStats } from '@/utils/api';

interface WorkItemStatsBarProps {
  stats: WorkItemStats | null;
}

export default function WorkItemStatsBar({ stats }: WorkItemStatsBarProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-25 md:h-26" />
        <Skeleton className="h-25 md:h-26" />
        <Skeleton className="h-25 md:h-26" />
      </div>
    );
  }

  return (
    <section className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="mt-1 text-2xl font-semibold">{stats.completion}%</p>
            </div>
            <ListTodo className="hidden size-5 shrink-0 text-muted-foreground sm:block" />
          </div>
          <Progress
            value={stats.completion}
            className="hidden w-full sm:block"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="mt-1 text-2xl font-semibold">{stats.open}</p>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              Not done yet
            </p>
          </div>
          <TrendingUp className="hidden size-5 shrink-0 text-muted-foreground sm:block" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">High priority</p>
            <p className="mt-1 text-2xl font-semibold">{stats.highPriority}</p>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              Open &amp; urgent
            </p>
          </div>
          <AlertTriangle className="hidden size-5 shrink-0 text-muted-foreground sm:block" />
        </CardContent>
      </Card>
    </section>
  );
}
