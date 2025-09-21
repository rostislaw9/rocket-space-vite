// Delete Confirmation Dialog Component
// Modal dialog for confirming destructive actions like deleting
// work items, comments, or other entities.
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { AlertTriangle } from 'lucide-react';

// Props for DeleteConfirmDialog component
interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isDeleting?: boolean;
  confirmText?: string;
}

// Delete confirmation dialog with warning styling
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isDeleting = false,
  confirmText = 'Delete',
}: DeleteConfirmDialogProps) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <ResponsiveModalFooter>
          <ResponsiveModalClose asChild>
            <Button variant="outline" disabled={isDeleting}>
              Cancel
            </Button>
          </ResponsiveModalClose>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : confirmText}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

export default DeleteConfirmDialog;
