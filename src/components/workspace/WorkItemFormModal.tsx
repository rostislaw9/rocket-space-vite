import type { Dispatch, FormEvent, SetStateAction } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  OrganizationMember,
  WorkItemPriority,
  WorkItemStatus,
} from '@/utils/api';

import DueDatePicker from './DueDatePicker';
import {
  emptyForm,
  priorityLabels,
  statusLabels,
  type WorkItemFormState,
} from './constants';

interface WorkItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: WorkItemFormState;
  setForm: Dispatch<SetStateAction<WorkItemFormState>>;
  orgMembers: OrganizationMember[];
  isPending: boolean;
  onSubmit: (event: FormEvent) => void;
}

export default function WorkItemFormModal({
  open,
  onOpenChange,
  form,
  setForm,
  orgMembers,
  isPending,
  onSubmit,
}: WorkItemFormModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setForm(emptyForm);
      }}
    >
      <ResponsiveModalContent showCloseButton={false}>
        <form onSubmit={onSubmit} className="space-y-4">
          <ResponsiveModalHeader className="border-b md:border-0">
            <ResponsiveModalTitle className="text-xl">
              New work item
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Fill in the details for your new task.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <div className="space-y-4 p-4 md:p-0">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((c: WorkItemFormState) => ({
                    ...c,
                    title: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((c: WorkItemFormState) => ({
                    ...c,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-10 gap-3">
              <div className="col-span-3 min-w-0 space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: WorkItemStatus) =>
                    setForm((c: WorkItemFormState) => ({ ...c, status: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Status</SelectLabel>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 min-w-0 space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v: WorkItemPriority) =>
                    setForm((c: WorkItemFormState) => ({ ...c, priority: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Priority</SelectLabel>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 min-w-0 space-y-2">
                <Label htmlFor="dueDate">Due</Label>
                <DueDatePicker
                  id="dueDate"
                  value={form.dueDate}
                  onChange={(dueDate) =>
                    setForm((c: WorkItemFormState) => ({ ...c, dueDate }))
                  }
                />
              </div>
            </div>
            {orgMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={form.assigneeId || '__none__'}
                  onValueChange={(v) =>
                    setForm((c: WorkItemFormState) => ({
                      ...c,
                      assigneeId: v === '__none__' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Assignee</SelectLabel>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {orgMembers.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user?.displayName ?? m.user?.email ?? m.userId}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <ResponsiveModalFooter className="border-t md:border-t">
            <ResponsiveModalClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveModalClose>
            <Button type="submit" disabled={isPending}>
              Create
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
