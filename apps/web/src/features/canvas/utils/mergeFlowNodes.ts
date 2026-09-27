import type { CanvasNode } from "@/features/canvas/typedefs";

export const mergeFlowNodes = (
  previous: CanvasNode[],
  next: CanvasNode[],
): CanvasNode[] => {
  const byId = new Map(previous.map((node) => [node.id, node]));

  return next.map((node) => {
    const before = byId.get(node.id);

    if (!before) return node;

    return {
      ...node,
      measured: before.measured,
      selected: before.selected,
      dragging: before.dragging,
      position: before.dragging ? before.position : node.position,
    };
  });
};
