import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  defaultAnimateLayoutChanges,
  useSortable,
  verticalListSortingStrategy,
  type AnimateLayoutChanges,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cva } from 'class-variance-authority';
import {
  Eye,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkItem, WorkItemStatus } from '@/utils/api';

import LoadingSpinner from '../LoadingSpinner';

const statusLabels: Record<WorkItemStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

const statusColors: Record<WorkItemStatus, string> = {
  todo: 'bg-slate-100 dark:bg-slate-800',
  in_progress: 'bg-blue-50 dark:bg-blue-950',
  done: 'bg-emerald-50 dark:bg-emerald-950',
};

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  args.isSorting || args.wasDragging ? true : defaultAnimateLayoutChanges(args);

interface KanbanCardProps {
  item: WorkItem;
  onEdit: (item: WorkItem) => void;
  onDelete: (item: WorkItem) => void;
  onOpenDetails: (item: WorkItem) => void;
}

function KanbanCardContent({
  item,
  onEdit,
  onDelete,
  onOpenDetails,
}: KanbanCardProps) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
            <p className="text-sm font-medium truncate">{item.title}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onPointerDown={(e) => e.stopPropagation()}
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
                <Eye className="size-4 mr-2" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(item);
                }}
              >
                <Pencil className="size-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item);
                }}
                variant="destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 leading-5 h-10 text-xs text-muted-foreground">
          {item.description ?? ''}
        </p>
      </CardContent>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant={item.priority === 'high' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {item.priority}
          </Badge>
          <div className="flex items-center gap-1.5 min-w-0">
            {item.dueDate && (
              <span className="text-xs text-muted-foreground shrink-0">
                {item.dueDate}
              </span>
            )}
            {item.assignee && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <UserCircle2 className="size-3 shrink-0" />
                <span className="truncate">
                  {item.assignee.displayName ?? item.assignee.email}
                </span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanCard({
  item,
  onEdit,
  onDelete,
  onOpenDetails,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    animateLayoutChanges,
    data: { item, status: item.status },
  });

  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, scaleX: 1, scaleY: 1 } : null,
    ),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.25 : 1,
    touchAction: 'none' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`kanban-card-${item.id}`}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onOpenDetails(item);
      }}
      className={`cursor-pointer select-none rounded-lg active:cursor-grabbing ${isDragging ? 'z-10 cursor-grabbing' : ''}`}
    >
      <KanbanCardContent
        item={item}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenDetails={onOpenDetails}
      />
    </div>
  );
}

const STATUSES: WorkItemStatus[] = ['todo', 'in_progress', 'done'];

function reorderWithinStatus(
  items: WorkItem[],
  status: WorkItemStatus,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
) {
  const columnItems = items.filter((item) => item.status === status);
  const oldIndex = columnItems.findIndex((item) => item.id === activeId);
  const newIndex = columnItems.findIndex((item) => item.id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return items;
  }

  const reorderedColumnItems = arrayMove(columnItems, oldIndex, newIndex);
  let columnIndex = 0;

  return items.map((item) => {
    if (item.status !== status) return item;
    return reorderedColumnItems[columnIndex++];
  });
}

function moveToStatusPosition(
  items: WorkItem[],
  activeId: UniqueIdentifier,
  status: WorkItemStatus,
  overId: UniqueIdentifier,
  targetIndex?: number,
) {
  const activeItem = items.find((item) => item.id === activeId);
  if (!activeItem) return items;

  const groups = STATUSES.reduce<Record<WorkItemStatus, WorkItem[]>>(
    (acc, currentStatus) => {
      acc[currentStatus] = items.filter(
        (item) => item.status === currentStatus && item.id !== activeId,
      );
      return acc;
    },
    { todo: [], in_progress: [], done: [] },
  );

  const targetItems = groups[status];
  const insertIndex =
    targetIndex ??
    (STATUSES.includes(overId as WorkItemStatus)
      ? targetItems.length
      : targetItems.findIndex((item) => item.id === overId));
  targetItems.splice(insertIndex >= 0 ? insertIndex : targetItems.length, 0, {
    ...activeItem,
    status,
  });

  return STATUSES.flatMap((currentStatus) => groups[currentStatus]);
}

interface KanbanColumnProps {
  status: WorkItemStatus;
  items: WorkItem[];
  onEdit: (item: WorkItem) => void;
  onDelete: (item: WorkItem) => void;
  onOpenDetails: (item: WorkItem) => void;
  pagination: ColumnPagination;
  onLoadMore: (status: WorkItemStatus) => void;
}

const columnVariants = cva('flex rounded-xl p-3 pr-1 h-full overflow-hidden', {
  variants: {
    status: {
      todo: statusColors.todo,
      in_progress: statusColors.in_progress,
      done: statusColors.done,
    },
  },
});

function KanbanColumn({
  status,
  items,
  onEdit,
  onDelete,
  onOpenDetails,
  pagination,
  onLoadMore,
}: KanbanColumnProps) {
  const itemIds = items.map((i) => i.id);
  const { setNodeRef } = useDroppable({ id: status });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pagination.hasMore || pagination.loading || pagination.error) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const viewport = sentinel.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (pagination.loading) return;
        if (!pagination.hasMore) return;
        if (pagination.error) return;

        onLoadMore(status);
      },
      { root: viewport, rootMargin: '100px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    status,
    pagination.hasMore,
    pagination.loading,
    pagination.error,
    onLoadMore,
  ]);

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm">{statusLabels[status]}</h3>
        <Badge variant="secondary" className="text-xs">
          {items.length}
        </Badge>
      </div>
      <div ref={setNodeRef} className={columnVariants({ status })}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <ScrollArea className="h-full w-full pr-3">
            <div className="flex flex-col gap-3 p-1">
              {items.map((item) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenDetails={onOpenDetails}
                />
              ))}
              {pagination.loading && (
                <div className="flex h-10 items-center justify-center">
                  <LoadingSpinner size={20} />
                </div>
              )}
              {pagination.hasMore && !pagination.loading && (
                <div ref={sentinelRef} className="h-4" />
              )}
            </div>
          </ScrollArea>
        </SortableContext>
      </div>
    </div>
  );
}

interface ColumnPagination {
  page: number;
  hasMore: boolean;
  loading: boolean;
  error?: boolean;
}

interface KanbanBoardProps {
  items: WorkItem[];
  pagination: Record<WorkItemStatus, ColumnPagination>;
  onEdit: (item: WorkItem) => void;
  onDelete: (item: WorkItem) => void;
  onOpenDetails: (item: WorkItem) => void;
  onReorder: (items: WorkItem[]) => void;
  onStatusReorder: (
    item: WorkItem,
    status: WorkItemStatus,
    items: WorkItem[],
  ) => void;
  onLoadMore: (status: WorkItemStatus) => void;
}

const KanbanBoard = memo(function KanbanBoard({
  items,
  pagination,
  onEdit,
  onDelete,
  onOpenDetails,
  onReorder,
  onStatusReorder,
  onLoadMore,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null);
  const [localItems, setLocalItems] = useState<WorkItem[]>(items);
  const localItemsRef = useRef<WorkItem[]>(items);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (isDraggingRef.current) return;
    localItemsRef.current = items;
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    document.body.style.cursor = activeId ? 'grabbing' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const collisionDetection = useCallback(
    (args: Parameters<typeof closestCenter>[0]) => {
      const pointerCollisions = pointerWithin(args);
      const cardCollision = pointerCollisions.find(
        (c) => !STATUSES.includes(c.id as WorkItemStatus),
      );
      if (cardCollision) {
        lastOverId.current = cardCollision.id;
        return [cardCollision];
      }
      const columnCollision = pointerCollisions.find((c) =>
        STATUSES.includes(c.id as WorkItemStatus),
      );
      if (columnCollision) {
        lastOverId.current = columnCollision.id;
        return [columnCollision];
      }
      const closest = getFirstCollision(closestCenter(args), 'id') as
        | UniqueIdentifier
        | undefined;
      const id = closest ?? lastOverId.current;
      return id ? [{ id }] : [];
    },
    [],
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    isDraggingRef.current = true;
    setActiveId(active.id);
    setOverlayWidth(active.rect.current.initial?.width ?? null);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return;

    setLocalItems((prev) => {
      const activeItem = prev.find((i) => i.id === active.id);
      if (!activeItem) return prev;

      const overIsColumn = STATUSES.includes(over.id as WorkItemStatus);
      const overStatus = overIsColumn
        ? (over.id as WorkItemStatus)
        : prev.find((i) => i.id === over.id)?.status;
      if (!overStatus) return prev;

      const targetIndex =
        overIsColumn && active.rect.current.translated
          ? (() => {
              const translatedTop = active.rect.current.translated!.top;
              return prev
                .filter(
                  (item) => item.status === overStatus && item.id !== active.id,
                )
                .findIndex((item) => {
                  const node = document.getElementById(
                    `kanban-card-${item.id}`,
                  );
                  if (!(node instanceof HTMLElement)) return false;
                  const rect = node.getBoundingClientRect();
                  return translatedTop < rect.top + rect.height / 2;
                });
            })()
          : undefined;
      const normalizedTargetIndex =
        targetIndex === -1 ? undefined : targetIndex;
      const result =
        activeItem.status === overStatus && !overIsColumn
          ? reorderWithinStatus(prev, overStatus, active.id, over.id)
          : moveToStatusPosition(
              prev,
              active.id,
              overStatus,
              over.id,
              normalizedTargetIndex,
            );
      if (result === prev) return prev;
      localItemsRef.current = result;
      return result;
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setOverlayWidth(null);
    lastOverId.current = null;

    if (!over) {
      isDraggingRef.current = false;
      localItemsRef.current = items;
      setLocalItems(items);
      return;
    }

    const activeItem = items.find((i) => i.id === active.id);
    const previewItems = localItemsRef.current;
    const localActive = previewItems.find((i) => i.id === active.id);
    if (!activeItem || !localActive) return;

    isDraggingRef.current = false;
    localItemsRef.current = previewItems;
    setLocalItems(previewItems);

    if (activeItem.status === localActive.status) {
      onReorder(previewItems.filter((i) => i.status === localActive.status));
    } else {
      onStatusReorder(activeItem, localActive.status, previewItems);
    }
  };

  const handleDragCancel = () => {
    isDraggingRef.current = false;
    setActiveId(null);
    setOverlayWidth(null);
    lastOverId.current = null;
    localItemsRef.current = items;
    setLocalItems(items);
  };

  const activeItem = activeId
    ? localItems.find((item) => item.id === activeId)
    : null;

  const todoItems = localItems.filter((i) => i.status === 'todo');
  const inProgressItems = localItems.filter((i) => i.status === 'in_progress');
  const doneItems = localItems.filter((i) => i.status === 'done');

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-24rem)]">
        <KanbanColumn
          status="todo"
          items={todoItems}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpenDetails={onOpenDetails}
          pagination={pagination.todo}
          onLoadMore={onLoadMore}
        />
        <KanbanColumn
          status="in_progress"
          items={inProgressItems}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpenDetails={onOpenDetails}
          pagination={pagination.in_progress}
          onLoadMore={onLoadMore}
        />
        <KanbanColumn
          status="done"
          items={doneItems}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpenDetails={onOpenDetails}
          pagination={pagination.done}
          onLoadMore={onLoadMore}
        />
      </div>
      <DragOverlay adjustScale={false} dropAnimation={null}>
        {activeItem ? (
          <div
            className="pointer-events-none cursor-grabbing select-none rounded-lg shadow-lg"
            style={{ width: overlayWidth ?? undefined }}
          >
            <KanbanCardContent
              item={activeItem}
              onEdit={() => undefined}
              onDelete={() => undefined}
              onOpenDetails={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

export default KanbanBoard;
