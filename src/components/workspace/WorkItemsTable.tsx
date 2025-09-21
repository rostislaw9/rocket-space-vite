import {
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WorkItem, WorkItemStatus } from '@/utils/api';
import { getPaginationItems } from '@/utils/get-pagination-items';
import { priorityLabels, statusLabels } from './constants';

interface WorkItemsTableProps {
  items: WorkItem[];
  onStatusChange: (item: WorkItem, status: WorkItemStatus) => void;
  onDone: (item: WorkItem) => void;
  onEdit: (item: WorkItem) => void;
  onDelete: (item: WorkItem) => void;
  onOpenDetails: (item: WorkItem) => void;
  page?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
}

export function WorkItemsTable({
  items,
  onStatusChange,
  onDone,
  onEdit,
  onDelete,
  onOpenDetails,
  page = 1,
  totalPages = 1,
  totalCount,
  onPageChange,
}: WorkItemsTableProps) {
  const paginationItems = getPaginationItems(page, totalPages);

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border">
      <Table className="min-w-[700px] table-fixed">
        <colgroup>
          <col className="w-[35%]" />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col className="w-[5%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              onClick={() => onOpenDetails(item)}
            >
              <TableCell>
                <div className="truncate font-medium">{item.title}</div>
                {item.description ? (
                  <div className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </div>
                ) : null}
              </TableCell>

              <TableCell onClick={(event) => event.stopPropagation()}>
                <Select
                  value={item.status}
                  onValueChange={(value: WorkItemStatus) =>
                    onStatusChange(item, value)
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
              </TableCell>

              <TableCell>
                <Badge
                  variant={item.priority === 'high' ? 'default' : 'secondary'}
                >
                  {priorityLabels[item.priority]}
                </Badge>
              </TableCell>

              <TableCell>{item.dueDate ?? '—'}</TableCell>

              <TableCell>
                <div className="flex justify-end gap-1">
                  {item.status !== 'done' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDone(item);
                      }}
                      aria-label="Mark done"
                    >
                      <CheckCircle2 className="size-4" />
                    </Button>
                  ) : null}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDetails(item);
                        }}
                      >
                        <Eye className="mr-2 size-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(item);
                        }}
                      >
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(item);
                        }}
                        variant="destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={1}>
              <span className="text-xs text-muted-foreground">
                {totalCount ?? items.length} item
                {(totalCount ?? items.length) === 1 ? '' : 's'}
                {totalPages > 1 && (
                  <span className="ml-1">
                    · Page {page} of {totalPages}
                  </span>
                )}
              </span>
            </TableCell>
            <TableCell colSpan={4}>
              {onPageChange && totalPages > 1 && (
                <Pagination className="justify-end">
                  <PaginationContent>
                    <PaginationPrevious
                      onClick={() => onPageChange(Math.max(1, page - 1))}
                      className={
                        page <= 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                    {paginationItems.map((item, idx) => (
                      <PaginationItem
                        key={item === 'ellipsis' ? `ellipsis-${idx}` : item}
                      >
                        {item === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            isActive={item === page}
                            onClick={() => onPageChange(item)}
                            className="cursor-pointer"
                          >
                            {item}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationNext
                      onClick={() =>
                        onPageChange(Math.min(totalPages, page + 1))
                      }
                      className={
                        page >= totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationContent>
                </Pagination>
              )}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export default WorkItemsTable;
