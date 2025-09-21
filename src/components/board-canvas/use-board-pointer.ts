import type { BoardElement } from '@/utils/api';
import type React from 'react';
import { useCallback, useRef } from 'react';
import { getBBox, hitElement, hitHandle, rotPt } from './geometry';
import { redrawAll } from './renderer';
import type { DrawTool, LocalElement, Point, Transform } from './types';
import { DEFAULT_TRANSFORM } from './types';

export interface CommitPayload {
  type: 'path' | 'line' | 'rect' | 'ellipse' | 'text';
  data: Record<string, unknown>;
  color: string;
  strokeWidth: number;
  zIndex: number;
}

interface UseBoardPointerOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  elementsRef: React.MutableRefObject<LocalElement[]>;
  toolRef: React.MutableRefObject<DrawTool>;
  colorRef: React.MutableRefObject<string>;
  strokeWidthRef: React.MutableRefObject<number>;
  selectedIdRef: React.MutableRefObject<string | null>;
  nextZRef: React.MutableRefObject<number>;
  setElements: (
    updater: LocalElement[] | ((prev: LocalElement[]) => LocalElement[]),
  ) => void;
  setSelectedId: (id: string | null) => void;
  setTextInputPos: (p: Point) => void;
  setTextInputVal: (v: string) => void;
  setTextInputFontSize: (n: number) => void;
  setTextInputVisible: (v: boolean) => void;
  setEditingElementId: (id: string | null) => void;
  textInputRef: React.RefObject<HTMLInputElement | null>;
  pushHistory: (snapshot: LocalElement[]) => void;
  dragHistorySnapshot: React.MutableRefObject<LocalElement[]>;
  wsDraw: (element: object, ack?: (saved: BoardElement) => void) => void;
  commitElement: (payload: CommitPayload) => void;
}

export function useBoardPointer({
  canvasRef,
  elementsRef,
  toolRef,
  colorRef,
  strokeWidthRef,
  selectedIdRef,
  nextZRef,
  setElements,
  setSelectedId,
  setTextInputPos,
  setTextInputVal,
  setTextInputFontSize,
  setTextInputVisible,
  setEditingElementId,
  textInputRef,
  pushHistory,
  dragHistorySnapshot,
  wsDraw,
  commitElement,
}: UseBoardPointerOptions) {
  const isDrawing = useRef(false);
  const startPt = useRef<Point>({ x: 0, y: 0 });
  const pathPts = useRef<Point[]>([]);

  const dragMode = useRef<
    'move' | 'scale-nw' | 'scale-ne' | 'scale-se' | 'scale-sw' | 'rotate' | null
  >(null);
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const dragOrigTransform = useRef<Transform>(DEFAULT_TRANSFORM);
  const dragOrigBBox = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const dragOrigData = useRef<Record<string, unknown>>({});
  // Fixed screen-space position of the anchor (opposite) corner during resize.
  const dragAnchorPt = useRef<Point>({ x: 0, y: 0 });

  const getPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): Point => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [canvasRef],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pos = getPos(e);
      const currentTool = toolRef.current;

      if (currentTool === 'select') {
        const currentSelectedId = selectedIdRef.current;
        // Check resize/rotate handles on the currently selected element first.
        if (currentSelectedId) {
          const selEl = elementsRef.current.find(
            (el) => el.id === currentSelectedId,
          );
          if (selEl) {
            const bb = getBBox(selEl);
            const handle = hitHandle(pos, bb, selEl.transform.rot);
            if (handle) {
              e.currentTarget.setPointerCapture(e.pointerId);
              isDrawing.current = true;
              dragStart.current = pos;
              dragOrigTransform.current = { ...selEl.transform };
              dragOrigBBox.current = bb;
              dragOrigData.current = { ...selEl.data };
              dragHistorySnapshot.current = elementsRef.current;
              dragMode.current =
                handle === 'rot'
                  ? 'rotate'
                  : handle === 'nw'
                    ? 'scale-nw'
                    : handle === 'ne'
                      ? 'scale-ne'
                      : handle === 'se'
                        ? 'scale-se'
                        : 'scale-sw';
              // Store the opposite corner in screen space as a fixed anchor for resize.
              {
                const rot = selEl.transform.rot;
                const cx = bb.x + bb.w / 2;
                const cy = bb.y + bb.h / 2;
                const rawAnchor =
                  handle === 'se'
                    ? { x: bb.x, y: bb.y }
                    : handle === 'nw'
                      ? { x: bb.x + bb.w, y: bb.y + bb.h }
                      : handle === 'ne'
                        ? { x: bb.x, y: bb.y + bb.h }
                        : { x: bb.x + bb.w, y: bb.y }; // sw handle → ne anchor
                dragAnchorPt.current = rotPt(
                  rawAnchor.x,
                  rawAnchor.y,
                  cx,
                  cy,
                  rot,
                );
              }
              return;
            }
          }
        }
        // Hit-test all elements top-to-bottom in z order.
        const sorted = [...elementsRef.current].sort(
          (a, b) => b.zIndex - a.zIndex,
        );
        const hit = sorted.find((el) => hitElement(pos, el));
        if (hit) {
          setSelectedId(hit.id);
          e.currentTarget.setPointerCapture(e.pointerId);
          isDrawing.current = true;
          dragStart.current = pos;
          dragOrigTransform.current = { ...hit.transform };
          dragOrigBBox.current = getBBox(hit);
          dragOrigData.current = { ...hit.data };
          dragHistorySnapshot.current = elementsRef.current;
          dragMode.current = 'move';
        } else {
          setSelectedId(null);
        }
        return;
      }

      if (currentTool === 'text') {
        const rect = canvasRef.current!.getBoundingClientRect();
        setTextInputPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setTextInputVal('');
        setTextInputFontSize(Math.max(12, strokeWidthRef.current * 6));
        setEditingElementId(null);
        setTextInputVisible(true);
        setTimeout(() => textInputRef.current?.focus(), 0);
        return;
      }

      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      startPt.current = pos;
      pathPts.current = [pos];
      setSelectedId(null);
    },
    [
      getPos,
      toolRef,
      selectedIdRef,
      elementsRef,
      dragHistorySnapshot,
      setSelectedId,
      canvasRef,
      setTextInputPos,
      setTextInputVal,
      setTextInputFontSize,
      strokeWidthRef,
      setEditingElementId,
      setTextInputVisible,
      textInputRef,
    ],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const pos = getPos(e);
      const canvas = canvasRef.current!;
      const currentTool = toolRef.current;
      const currentSelectedId = selectedIdRef.current;

      if (currentTool === 'select' && currentSelectedId) {
        const dx = pos.x - dragStart.current.x;
        const dy = pos.y - dragStart.current.y;
        const orig = dragOrigTransform.current;
        const bb = dragOrigBBox.current;
        const origData = dragOrigData.current;

        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== currentSelectedId) return el;

            if (dragMode.current === 'move') {
              return {
                ...el,
                transform: { ...orig, tx: orig.tx + dx, ty: orig.ty + dy },
              };
            }

            if (dragMode.current === 'rotate') {
              const cx = bb.x + bb.w / 2;
              const cy = bb.y + bb.h / 2;
              const startAngle = Math.atan2(
                dragStart.current.y - cy,
                dragStart.current.x - cx,
              );
              const currentAngle = Math.atan2(pos.y - cy, pos.x - cx);
              return {
                ...el,
                transform: {
                  ...orig,
                  rot: orig.rot + (currentAngle - startAngle),
                },
              };
            }

            // Scale: bake new dimensions directly into element data.
            const mode = dragMode.current;
            if (!mode || !mode.startsWith('scale-')) return el;

            // Convert screen-space delta into element-local space.
            const rot = orig.rot;
            const cosR = Math.cos(-rot);
            const sinR = Math.sin(-rot);
            const ldx = dx * cosR - dy * sinR;
            const ldy = dx * sinR + dy * cosR;

            const minSize = 10;
            let newW = bb.w;
            let newH = bb.h;

            if (mode === 'scale-se') {
              newW = Math.max(minSize, bb.w + ldx);
              newH = Math.max(minSize, bb.h + ldy);
            } else if (mode === 'scale-sw') {
              newW = Math.max(minSize, bb.w - ldx);
              newH = Math.max(minSize, bb.h + ldy);
            } else if (mode === 'scale-nw') {
              newW = Math.max(minSize, bb.w - ldx);
              newH = Math.max(minSize, bb.h - ldy);
            } else if (mode === 'scale-ne') {
              newW = Math.max(minSize, bb.w + ldx);
              newH = Math.max(minSize, bb.h - ldy);
            }

            // Keep the opposite corner fixed: compute new bbox centre from anchor point.
            const anchor = dragAnchorPt.current;
            const anchorLocalX =
              mode === 'scale-se'
                ? -newW / 2
                : mode === 'scale-sw'
                  ? newW / 2
                  : mode === 'scale-nw'
                    ? newW / 2
                    : -newW / 2; // ne
            const anchorLocalY =
              mode === 'scale-se'
                ? -newH / 2
                : mode === 'scale-sw'
                  ? -newH / 2
                  : mode === 'scale-nw'
                    ? newH / 2
                    : newH / 2; // ne
            const cosF = Math.cos(rot);
            const sinF = Math.sin(rot);
            const anchorOffsetX = anchorLocalX * cosF - anchorLocalY * sinF;
            const anchorOffsetY = anchorLocalX * sinF + anchorLocalY * cosF;
            const newCx = anchor.x - anchorOffsetX;
            const newCy = anchor.y - anchorOffsetY;
            const scaleX = newW / Math.max(1, bb.w);
            const scaleY = newH / Math.max(1, bb.h);
            // Compute the data-space centre of the element after scale.
            let newDataCx = 0;
            let newDataCy = 0;
            switch (el.type) {
              case 'rect': {
                const d = origData as {
                  x: number;
                  y: number;
                  w: number;
                  h: number;
                };
                newDataCx = d.x + (d.w * scaleX) / 2;
                newDataCy = d.y + (d.h * scaleY) / 2;
                break;
              }
              case 'ellipse': {
                const d = origData as { cx: number; cy: number };
                newDataCx = d.cx;
                newDataCy = d.cy;
                break;
              }
              case 'line': {
                const d = origData as {
                  x1: number;
                  y1: number;
                  x2: number;
                  y2: number;
                };
                const lx = Math.min(d.x1, d.x2);
                const ly = Math.min(d.y1, d.y2);
                newDataCx = lx + (bb.w * scaleX) / 2;
                newDataCy = ly + (bb.h * scaleY) / 2;
                break;
              }
              case 'path': {
                const pts = (origData.points ?? []) as Point[];
                const pxs = pts.map((p: Point) => p.x);
                const pys = pts.map((p: Point) => p.y);
                const ox = Math.min(...pxs);
                const oy = Math.min(...pys);
                newDataCx = ox + (bb.w * scaleX) / 2;
                newDataCy = oy + (bb.h * scaleY) / 2;
                break;
              }
              case 'text': {
                const d = origData as {
                  x: number;
                  y: number;
                  text: string;
                  fontSize?: number;
                };
                const origFs = d.fontSize ?? Math.max(12, el.strokeWidth * 6);
                const newFs = Math.max(8, (origFs * (scaleX + scaleY)) / 2);
                newDataCx =
                  d.x +
                  Math.max(20, (d.text as string).length * newFs * 0.6) / 2;
                newDataCy = d.y - newFs + (newFs * 1.4) / 2;
                break;
              }
              default:
                newDataCx = bb.x - orig.tx + newW / 2;
                newDataCy = bb.y - orig.ty + newH / 2;
            }
            // screen centre = data centre + tx, so: newTx = newCx - newDataCx
            const newTx = newCx - newDataCx;
            const newTy = newCy - newDataCy;

            let newData = { ...origData };

            switch (el.type) {
              case 'rect': {
                const d = origData as {
                  x: number;
                  y: number;
                  w: number;
                  h: number;
                };
                newData = { ...d, w: d.w * scaleX, h: d.h * scaleY };
                break;
              }
              case 'ellipse': {
                const d = origData as {
                  cx: number;
                  cy: number;
                  rx: number;
                  ry: number;
                };
                newData = { ...d, rx: d.rx * scaleX, ry: d.ry * scaleY };
                break;
              }
              case 'line': {
                const d = origData as {
                  x1: number;
                  y1: number;
                  x2: number;
                  y2: number;
                };
                const lx = Math.min(d.x1, d.x2);
                const ly = Math.min(d.y1, d.y2);
                newData = {
                  x1: lx + (d.x1 - lx) * scaleX,
                  y1: ly + (d.y1 - ly) * scaleY,
                  x2: lx + (d.x2 - lx) * scaleX,
                  y2: ly + (d.y2 - ly) * scaleY,
                };
                break;
              }
              case 'path': {
                const pts = (origData.points ?? []) as Point[];
                const pxs = pts.map((p: Point) => p.x);
                const pys = pts.map((p: Point) => p.y);
                const ox = Math.min(...pxs);
                const oy = Math.min(...pys);
                newData = {
                  points: pts.map((p: Point) => ({
                    x: ox + (p.x - ox) * scaleX,
                    y: oy + (p.y - oy) * scaleY,
                  })),
                };
                break;
              }
              case 'text': {
                const d = origData as {
                  x: number;
                  y: number;
                  text: string;
                  fontSize?: number;
                };
                const origFs = d.fontSize ?? Math.max(12, el.strokeWidth * 6);
                const newFs = Math.max(8, (origFs * (scaleX + scaleY)) / 2);
                newData = { ...d, fontSize: newFs };
                break;
              }
            }

            return {
              ...el,
              data: newData,
              transform: { ...orig, tx: newTx, ty: newTy, sx: 1, sy: 1 },
            };
          }),
        );
        return;
      }

      if (currentTool === 'pen') {
        pathPts.current.push(pos);
        redrawAll(canvas, elementsRef.current, null, (ctx) => {
          ctx.strokeStyle = colorRef.current;
          ctx.lineWidth = strokeWidthRef.current;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pathPts.current[0].x, pathPts.current[0].y);
          pathPts.current.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        });
      } else {
        const { x: x1, y: y1 } = startPt.current;
        redrawAll(canvas, elementsRef.current, null, (ctx) => {
          ctx.strokeStyle = colorRef.current;
          ctx.lineWidth = strokeWidthRef.current;
          ctx.lineCap = 'round';
          if (currentTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
          } else if (currentTool === 'rect') {
            ctx.strokeRect(x1, y1, pos.x - x1, pos.y - y1);
          } else if (currentTool === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(
              (x1 + pos.x) / 2,
              (y1 + pos.y) / 2,
              Math.abs(pos.x - x1) / 2,
              Math.abs(pos.y - y1) / 2,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          }
        });
      }
    },
    [
      getPos,
      canvasRef,
      toolRef,
      selectedIdRef,
      elementsRef,
      colorRef,
      strokeWidthRef,
      setElements,
    ],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const endDragMode = dragMode.current;
      dragMode.current = null;

      const pos = getPos(e);
      const currentTool = toolRef.current;

      if (currentTool === 'select') {
        const currentSelectedId = selectedIdRef.current;
        if (currentSelectedId && endDragMode !== null) {
          const el = elementsRef.current.find(
            (x) => x.id === currentSelectedId,
          );
          const orig = dragOrigTransform.current;
          const EPS = 0.5; // ignore sub-pixel jitter from a plain click
          const changed =
            el &&
            (endDragMode !== 'move'
              ? true // scale/rotate always modifies data
              : Math.abs(el.transform.tx - orig.tx) > EPS ||
                Math.abs(el.transform.ty - orig.ty) > EPS);
          if (el && changed) {
            pushHistory(dragHistorySnapshot.current);
            wsDraw({
              id: el.id,
              type: el.type,
              data: { ...el.data, _transform: el.transform },
              color: el.color,
              strokeWidth: el.strokeWidth,
              zIndex: el.zIndex,
            });
          }
        }
        dragMode.current = null;
        return;
      }

      const z = nextZRef.current++;

      if (currentTool === 'pen') {
        if (pathPts.current.length < 2) return;
        commitElement({
          type: 'path',
          data: { points: pathPts.current },
          color: colorRef.current,
          strokeWidth: strokeWidthRef.current,
          zIndex: z,
        });
      } else if (currentTool === 'line') {
        const { x: x1, y: y1 } = startPt.current;
        commitElement({
          type: 'line',
          data: { x1, y1, x2: pos.x, y2: pos.y },
          color: colorRef.current,
          strokeWidth: strokeWidthRef.current,
          zIndex: z,
        });
      } else if (currentTool === 'rect') {
        const { x, y } = startPt.current;
        commitElement({
          type: 'rect',
          data: { x, y, w: pos.x - x, h: pos.y - y },
          color: colorRef.current,
          strokeWidth: strokeWidthRef.current,
          zIndex: z,
        });
      } else if (currentTool === 'ellipse') {
        const { x: x1, y: y1 } = startPt.current;
        commitElement({
          type: 'ellipse',
          data: {
            cx: (x1 + pos.x) / 2,
            cy: (y1 + pos.y) / 2,
            rx: (pos.x - x1) / 2,
            ry: (pos.y - y1) / 2,
          },
          color: colorRef.current,
          strokeWidth: strokeWidthRef.current,
          zIndex: z,
        });
      }
      pathPts.current = [];
    },
    [
      getPos,
      toolRef,
      selectedIdRef,
      elementsRef,
      nextZRef,
      colorRef,
      strokeWidthRef,
      pushHistory,
      dragHistorySnapshot,
      wsDraw,
      commitElement,
    ],
  );

  return { isDrawing, onPointerDown, onPointerMove, onPointerUp };
}
