import { AlertTriangle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ServerErrorFrameProps {
  onRetry?: () => void;
}

export default function ServerErrorFrame({ onRetry }: ServerErrorFrameProps) {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <span className="flex size-14 items-center justify-center rounded-xl border bg-muted text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <div className="space-y-1.5">
          <p className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </p>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred on our side. Try again or refresh the
            page.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onRetry ?? (() => window.location.reload())}
        >
          <RotateCcw className="size-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}
