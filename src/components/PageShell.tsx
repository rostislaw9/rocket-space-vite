import { useEffect, type ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useBreadCrumbs, type Crumb } from '@/hooks/use-breadcrumbs';

export default function PageShell({
  title,
  description,
  actions,
  children,
  maxWidth = 'max-w-6xl',
  fullHeight = false,
  parentCrumbs,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  fullHeight?: boolean;
  parentCrumbs?: Crumb[];
}) {
  const { setCrumbs } = useBreadCrumbs();

  useEffect(() => {
    setCrumbs([...(parentCrumbs ?? []), { label: title ?? '...' }]);
    return () => setCrumbs([]);
    // parentCrumbs is intentionally excluded: it's defined inline by callers and would cause infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, setCrumbs]);

  return (
    <div
      className={`mx-auto flex w-full flex-col gap-4 ${maxWidth} ${fullHeight ? 'min-h-0 flex-1' : ''}`}
    >
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {title ? (
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          ) : (
            <Skeleton className="h-8 w-64" />
          )}
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-nowrap gap-2 sm:w-auto sm:min-w-0 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </section>
      {children}
    </div>
  );
}
