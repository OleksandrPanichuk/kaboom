export const GRID_COLUMNS = 4;
export const GRID_SPACING = { x: 280, y: 160 } as const;
export const NODE_WIDTH = 208;
export const NODE_HEIGHT = 58;
export const TABLE_WIDTH = 248;
export const TABLE_HEADER_HEIGHT = 45;
export const TABLE_ROW_HEIGHT = 28;
export const NODE_KIND_MIME = "application/x-kaboom-node-kind";
export const CANVAS_ELEMENT_ID = "design-canvas";
export const NODE_GAP = 24;

export const REGION_PADDING = 28;

export const REGION_LABEL_HEIGHT = 30;

export const REGION_TONES = [
  "border-sky-300 bg-sky-50/60 text-sky-800",
  "border-emerald-300 bg-emerald-50/60 text-emerald-800",
  "border-violet-300 bg-violet-50/60 text-violet-800",
  "border-amber-300 bg-amber-50/60 text-amber-800",
] as const;
