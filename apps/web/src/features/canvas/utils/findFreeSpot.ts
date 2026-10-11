import { NODE_GAP, NODE_HEIGHT, NODE_WIDTH } from "@/features/canvas/constants";

interface Point {
  x: number;
  y: number;
}

interface Box extends Point {
  width?: number;
  height?: number;
}

interface Size {
  width: number;
  height: number;
}

const MAX_RING = 12;

const DEFAULT_SIZE: Size = { width: NODE_WIDTH, height: NODE_HEIGHT };

const overlaps = (taken: Box, spot: Point, size: Size): boolean => {
  const width = taken.width ?? NODE_WIDTH;
  const height = taken.height ?? NODE_HEIGHT;

  return (
    spot.x < taken.x + width + NODE_GAP &&
    taken.x < spot.x + size.width + NODE_GAP &&
    spot.y < taken.y + height + NODE_GAP &&
    taken.y < spot.y + size.height + NODE_GAP
  );
};

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

export const findFreeSpot = (
  taken: Box[],
  wanted: Point,
  size: Size = DEFAULT_SIZE,
): Point => {
  const cell = { x: size.width + NODE_GAP, y: size.height + NODE_GAP };

  for (let radius = 0; radius <= MAX_RING; radius++) {
    for (const step of ring(radius)) {
      const spot = {
        x: wanted.x + step.x * cell.x,
        y: wanted.y + step.y * cell.y,
      };

      if (!taken.some((box) => overlaps(box, spot, size))) return spot;
    }
  }

  return wanted;
};
