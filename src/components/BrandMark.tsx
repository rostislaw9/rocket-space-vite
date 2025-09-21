import { Rocket } from 'lucide-react';

import { cn } from '@/lib/utils';

interface BrandMarkProps {
  compact?: boolean;
  className?: string;
}

export default function BrandMark({ compact, className }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex items-center justify-center rounded-lg border bg-primary text-primary-foreground shadow-sm',
          compact ? 'size-8' : 'size-10',
        )}
      >
        <Rocket className={compact ? 'size-4' : 'size-5'} />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-semibold tracking-wide text-foreground">
            Rocket Space
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Interactive workspace
          </span>
        </span>
      )}
    </div>
  );
}
