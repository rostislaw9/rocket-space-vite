import { getBBox, getHandles, HANDLE_SIZE, rotPt } from './geometry';
import type { LocalElement, Point } from './types';

export function renderElement(
  ctx: CanvasRenderingContext2D,
  el: LocalElement,
  selected = false,
) {
  const t = el.transform;
  ctx.save();

  // Rotate around the bbox centre so handles stay aligned.
  const bb = getBBox(el);
  const cx = bb.x + bb.w / 2;
  const cy = bb.y + bb.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate(t.rot);
  ctx.translate(-cx, -cy);

  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (el.type) {
    case 'path': {
      const pts = (el.data.points ?? []) as Point[];
      if (!pts.length) break;
      ctx.beginPath();
      ctx.moveTo(pts[0].x + t.tx, pts[0].y + t.ty);
      for (let i = 1; i < pts.length; i++)
        ctx.lineTo(pts[i].x + t.tx, pts[i].y + t.ty);
      ctx.stroke();
      break;
    }
    case 'line': {
      const d = el.data as { x1: number; y1: number; x2: number; y2: number };
      ctx.beginPath();
      ctx.moveTo(d.x1 + t.tx, d.y1 + t.ty);
      ctx.lineTo(d.x2 + t.tx, d.y2 + t.ty);
      ctx.stroke();
      break;
    }
    case 'rect': {
      const d = el.data as { x: number; y: number; w: number; h: number };
      ctx.strokeRect(d.x + t.tx, d.y + t.ty, d.w, d.h);
      break;
    }
    case 'ellipse': {
      const d = el.data as { cx: number; cy: number; rx: number; ry: number };
      ctx.beginPath();
      ctx.ellipse(
        d.cx + t.tx,
        d.cy + t.ty,
        Math.abs(d.rx),
        Math.abs(d.ry),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
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
      ctx.font = `${fs}px sans-serif`;
      ctx.fillText(d.text as string, d.x + t.tx, d.y + t.ty);
      break;
    }
  }

  ctx.restore();

  if (selected) {
    const sbb = getBBox(el);
    const scx = sbb.x + sbb.w / 2;
    const scy = sbb.y + sbb.h / 2;

    // Dashed selection border, rotated with the element.
    ctx.save();
    ctx.translate(scx, scy);
    ctx.rotate(t.rot);
    ctx.translate(-scx, -scy);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(sbb.x - 2, sbb.y - 2, sbb.w + 4, sbb.h + 4);
    ctx.setLineDash([]);
    ctx.restore();

    // Stem line from bbox top edge to rotation handle.
    const rotHandlePos = rotPt(scx, sbb.y - 22, scx, scy, t.rot);
    const stemBase = rotPt(scx, sbb.y - 2, scx, scy, t.rot);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(stemBase.x, stemBase.y);
    ctx.lineTo(rotHandlePos.x, rotHandlePos.y);
    ctx.stroke();

    const handles = getHandles(sbb, t.rot);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    for (const [key, centre] of Object.entries(handles)) {
      if (key === 'rot') {
        // Rotation handle.
        const size = 16;
        const half = size / 2;
        const scale = size / 24;
        ctx.save();
        ctx.translate(centre.x, centre.y);
        ctx.rotate(t.rot);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, half + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(-half, -half);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#3b82f6';
        ctx.fillStyle = '#3b82f6';
        ctx.lineWidth = 2 / scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const p1 = new Path2D(
          'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8',
        );
        ctx.stroke(p1);
        ctx.beginPath();
        const p2 = new Path2D('M3 3v5h5');
        ctx.stroke(p2);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(centre.x, centre.y);
        ctx.rotate(t.rot);
        ctx.beginPath();
        ctx.rect(-HANDLE_SIZE / 2, -HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

export function redrawAll(
  canvas: HTMLCanvasElement,
  elements: LocalElement[],
  selectedId: string | null,
  livePreview?: (ctx: CanvasRenderingContext2D) => void,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sorted = [...elements].sort(
    (a, b) => a.zIndex - b.zIndex || a.createdAt.localeCompare(b.createdAt),
  );
  for (const el of sorted) renderElement(ctx, el, el.id === selectedId);
  if (livePreview) livePreview(ctx);
}
