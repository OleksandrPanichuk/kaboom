import { NODE_GAP, NODE_HEIGHT, NODE_WIDTH } from "@/features/canvas/constants";

interface Point {
  x: number;
  y: number;
}

const CELL = { x: NODE_WIDTH + NODE_GAP, y: NODE_HEIGHT + NODE_GAP };
const MAX_RING = 12;

const overlaps = (a: Point, b: Point): boolean =>
  Math.abs(a.x - b.x) < CELL.x && Math.abs(a.y - b.y) < CELL.y;

const ring = (radius: number): Point[] => {
  if (radius === 0) return [{ x: 0, y: 0 }];

  const cells: Point[] = [];

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === radius) {
        cells.push({ x: dx, y: dy });
      }
    }
  }

  return cells.sort(
    (a, b) => Math.hypot(a.x, a.y * 2) - Math.hypot(b.x, b.y * 2),
  );
};

export const findFreeSpot = (taken: Point[], wanted: Point): Point => {
  for (let radius = 0; radius <= MAX_RING; radius++) {
    for (const cell of ring(radius)) {
      const spot = {
        x: wanted.x + cell.x * CELL.x,
        y: wanted.y + cell.y * CELL.y,
      };

      if (!taken.some((point) => overlaps(point, spot))) return spot;
    }
  }

  return wanted;
};
