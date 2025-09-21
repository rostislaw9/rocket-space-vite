// Workspace Component Constants
// Shared constants for work item forms and displays.
import type { WorkItemPriority, WorkItemStatus } from '@/utils/api';

// Labels for work item statuses
export const statusLabels: Record<WorkItemStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

// Labels for work item priorities
export const priorityLabels: Record<WorkItemPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

// Default empty form values
export const emptyForm = {
  title: '',
  description: '',
  status: 'todo' as WorkItemStatus,
  priority: 'medium' as WorkItemPriority,
  dueDate: undefined as Date | undefined,
  assigneeId: '' as string,
};

// Type for work item form state
export type WorkItemFormState = typeof emptyForm;
