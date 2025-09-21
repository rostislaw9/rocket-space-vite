import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Circle,
  Minus,
  MousePointer2,
  Pen,
  Redo2,
  Square,
  Type,
  Undo2,
} from 'lucide-react';
import type { DrawTool, LocalElement } from './types';

function ToolBtn({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={active ? 'default' : 'ghost'}
            size="icon"
            onClick={onClick}
            disabled={disabled}
            className="size-9 shrink-0"
          >
            <Icon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="sm:hidden">
          {label}
        </TooltipContent>
        <TooltipContent side="right" className="hidden sm:block">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface BoardToolbarProps {
  tool: DrawTool;
  setTool: (t: DrawTool) => void;
  color: string;
  strokeWidth: number;
  setStrokeWidth: (n: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  handleColorPreview: (c: string) => void;
  handleColorChange: (c: string) => void;
  elementsRef: React.MutableRefObject<LocalElement[]>;
  undoStackRef: React.MutableRefObject<LocalElement[][]>;
  redoStackRef: React.MutableRefObject<LocalElement[][]>;
}

const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#6b7280',
  '#d1d5db',
  '#7f1d1d',
  '#1e3a5f',
  '#14532d',
];

export default function BoardToolbar({
  tool,
  setTool,
  color,
  strokeWidth,
  setStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  handleColorPreview,
  handleColorChange,
}: BoardToolbarProps) {
  const isMobile = useIsMobile();

  return (
    <aside className="flex shrink-0 flex-row flex-wrap items-center gap-1 rounded-lg border bg-card h-fit p-1 sm:flex-col sm:flex-nowrap">
      <ToolBtn
        icon={Undo2}
        label="Undo (Ctrl+Z)"
        active={false}
        onClick={onUndo}
        disabled={!canUndo}
      />
      <ToolBtn
        icon={Redo2}
        label="Redo (Ctrl+Shift+Z)"
        active={false}
        onClick={onRedo}
        disabled={!canRedo}
      />

      <Separator orientation={isMobile ? 'vertical' : 'horizontal'} />

      <ToolBtn
        icon={MousePointer2}
        label="Select / Move"
        active={tool === 'select'}
        onClick={() => setTool('select')}
      />
      <ToolBtn
        icon={Pen}
        label="Pen"
        active={tool === 'pen'}
        onClick={() => setTool('pen')}
      />
      <ToolBtn
        icon={Minus}
        label="Line"
        active={tool === 'line'}
        onClick={() => setTool('line')}
      />
      <ToolBtn
        icon={Square}
        label="Rectangle"
        active={tool === 'rect'}
        onClick={() => setTool('rect')}
      />
      <ToolBtn
        icon={Circle}
        label="Ellipse"
        active={tool === 'ellipse'}
        onClick={() => setTool('ellipse')}
      />
      <ToolBtn
        icon={Type}
        label="Text"
        active={tool === 'text'}
        onClick={() => setTool('text')}
      />

      <Separator className="hidden sm:block sm:my-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="size-7 cursor-pointer rounded-full border-2 border-input shadow-sm focus:outline-none"
            style={{ background: color }}
            title="Color"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="center"
          className="p-2 w-auto sm:side-right"
        >
          <div className="grid grid-cols-5 gap-1 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className="size-6 rounded-full border border-input hover:scale-110 transition-transform"
                style={{ background: c }}
                onClick={() => handleColorChange(c)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorPreview(e.target.value)}
              onBlur={(e) => handleColorChange(e.target.value)}
              className="size-6 cursor-pointer rounded border border-input"
            />
            <span className="text-xs text-muted-foreground font-mono">
              {color}
            </span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator className="hidden sm:block sm:my-1" />

      <div
        className="flex min-h-9 shrink-0 items-center gap-1 px-1 sm:min-h-0 sm:flex-col sm:px-0 sm:py-1"
        title={`Stroke: ${strokeWidth}px`}
      >
        <Slider
          min={1}
          max={20}
          step={1}
          value={[strokeWidth]}
          onValueChange={([v]: number[]) => setStrokeWidth(v)}
          orientation="horizontal"
          className="w-24 sm:hidden"
        />
        <Slider
          min={1}
          max={20}
          step={1}
          value={[strokeWidth]}
          onValueChange={([v]: number[]) => setStrokeWidth(v)}
          orientation="vertical"
          className="hidden h-20 sm:flex"
        />
        <div className="hidden h-5 w-5 items-center justify-center sm:flex">
          <div
            className="rounded-full bg-foreground"
            style={{
              width: Math.min(strokeWidth * 1.5, 20),
              height: Math.min(strokeWidth * 1.5, 20),
            }}
          />
        </div>
        <span className="hidden text-[10px] text-muted-foreground sm:block">
          {strokeWidth}
        </span>
      </div>
    </aside>
  );
}
