export type ColumnSide = "in" | "out";

export type ColumnEdge = "left" | "right";

export const columnHandle = (
  columnId: string,
  side: ColumnSide,
  edge: ColumnEdge,
): string => `${columnId}:${side}:${edge}`;

export const columnOfHandle = (
  handle: string | null | undefined,
): string | null => {
  const parts = handle?.split(":") ?? [];

  return parts.length >= 3 ? parts.slice(0, -2).join(":") : null;
};
