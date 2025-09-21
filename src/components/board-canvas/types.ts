import type { BoardElement } from '@/utils/api';

export type DrawTool = 'select' | 'pen' | 'line' | 'rect' | 'ellipse' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  rot: number;
}

export interface LocalElement extends BoardElement {
  transform: Transform;
}

export const DEFAULT_TRANSFORM: Transform = {
  tx: 0,
  ty: 0,
  sx: 1,
  sy: 1,
  rot: 0,
};
