import { AlertCircle, RotateCcw } from 'lucide-react';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ApiErrorAlertProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ApiErrorAlert({
  title = 'Failed to load data',
  description = 'Could not fetch data. Please try again.',
  onRetry,
}: ApiErrorAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button variant="destructive" onClick={onRetry}>
            <RotateCcw />
            Retry
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
