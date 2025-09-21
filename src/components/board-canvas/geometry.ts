import type { LocalElement, Point } from './types';

export function getBBox(el: LocalElement): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const t = el.transform;
  let x = 0,
    y = 0,
    w = 0,
    h = 0;
  switch (el.type) {
    case 'path': {
      const pts = (el.data.points ?? []) as Point[];
      if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
      const xs = pts.map((p) => p.x),
        ys = pts.map((p) => p.y);
      x = Math.min(...xs);
      y = Math.min(...ys);
      w = Math.max(...xs) - x;
      h = Math.max(...ys) - y;
      break;
    }
    case 'line': {
      const d = el.data as { x1: number; y1: number; x2: number; y2: number };
      x = Math.min(d.x1, d.x2);
      y = Math.min(d.y1, d.y2);
      w = Math.abs(d.x2 - d.x1);
      h = Math.abs(d.y2 - d.y1);
      break;
    }
    case 'rect': {
      const d = el.data as { x: number; y: number; w: number; h: number };
      x = d.x;
      y = d.y;
      w = d.w;
      h = d.h;
      break;
    }
    case 'ellipse': {
      const d = el.data as { cx: number; cy: number; rx: number; ry: number };
      x = d.cx - Math.abs(d.rx);
      y = d.cy - Math.abs(d.ry);
      w = Math.abs(d.rx) * 2;
      h = Math.abs(d.ry) * 2;
      break;
    }
    case 'text': {
      const d = el.data as {
        x: number;
        y: number;
        text: string;
        fontSize?: number;
      };
      const fs = d.fontSize ?? Math.max(12, el.strokeWidth * 6);
      x = d.x;
      y = d.y - fs;
      w = Math.max(20, (d.text as string).length * fs * 0.6);
      h = fs * 1.4;
      break;
    }
  }
  return { x: x + t.tx, y: y + t.ty, w, h };
}

export function rotPt(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angle: number,
): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: cx + (px - cx) * cos - (py - cy) * sin,
    y: cy + (px - cx) * sin + (py - cy) * cos,
  };
}

export const HANDLE_SIZE = 8;

export function getHandles(
  bb: ReturnType<typeof getBBox>,
  rot: number,
): Record<string, Point> {
  const { x, y, w, h } = bb;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const raw: Record<string, Point> = {
    nw: { x, y },
    ne: { x: x + w, y },
    se: { x: x + w, y: y + h },
    sw: { x, y: y + h },
    rot: { x: cx, y: y - 22 },
  };
  const result: Record<string, Point> = {};
  for (const [k, p] of Object.entries(raw)) {
    result[k] = rotPt(p.x, p.y, cx, cy, rot);
  }
  return result;
}

export function hitHandle(
  pt: Point,
  bb: ReturnType<typeof getBBox>,
  rot: number,
): string | null {
  const handles = getHandles(bb, rot);
  const half = HANDLE_SIZE / 2 + 2; // slightly larger than visual for easier interaction
  for (const [name, centre] of Object.entries(handles)) {
    if (Math.abs(pt.x - centre.x) <= half && Math.abs(pt.y - centre.y) <= half)
      return name;
  }
  return null;
}

export function hitElement(pt: Point, el: LocalElement): boolean {
  const bb = getBBox(el);
  return (
    pt.x >= bb.x && pt.x <= bb.x + bb.w && pt.y >= bb.y && pt.y <= bb.y + bb.h
  );
}
