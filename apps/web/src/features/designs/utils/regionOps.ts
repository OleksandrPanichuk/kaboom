import type { DesignGraph, DesignGroup, DesignOp } from "@repo/design";

import { NEW_REGION, type RegionTarget } from "@/features/properties";

export const regionsOf = (graph: DesignGraph): DesignGroup[] =>
  graph.groups.filter((group) => group.kind === "region");

const nextRegionLabel = (graph: DesignGraph): string => {
  const taken = new Set(regionsOf(graph).map((group) => group.label));
  let index = regionsOf(graph).length + 1;

  while (taken.has(`Region ${index}`)) index++;

  return `Region ${index}`;
};

export const emptiedRegionOps = (
  graph: DesignGraph,
  leaving: ReadonlySet<string>,
  keep: string | null = null,
): DesignOp[] =>
  regionsOf(graph)
    .filter(
      (group) =>
        group.id !== keep &&
        !graph.groups.some((child) => child.parentId === group.id) &&
        graph.nodes.some((node) => node.groupId === group.id) &&
        graph.nodes.every(
          (node) => node.groupId !== group.id || leaving.has(node.id),
        ),
    )
    .map((group) => ({ op: "remove-group", id: group.id }));

export const placementOps = (
  graph: DesignGraph,
  nodeIds: readonly string[],
  target: RegionTarget,
): DesignOp[] => {
  const created: DesignGroup | null =
    target === NEW_REGION
      ? {
          id: `region-${crypto.randomUUID().slice(0, 8)}`,
          kind: "region",
          label: nextRegionLabel(graph),
          parentId: null,
        }
      : null;
  const groupId = created ? created.id : target;
  const moving = graph.nodes.filter(
    (node) => nodeIds.includes(node.id) && node.groupId !== groupId,
  );

  if (moving.length === 0) return [];

  return [
    ...(created ? [{ op: "add-group", group: created } as const] : []),
    ...moving.map((node): DesignOp => ({
      op: "update-node",
      id: node.id,
      patch: { groupId },
    })),
    ...emptiedRegionOps(graph, new Set(moving.map((node) => node.id)), groupId),
  ];
};

export const dissolveRegionOps = (
  graph: DesignGraph,
  id: string,
): DesignOp[] => [
  ...graph.nodes
    .filter((node) => node.groupId === id)
    .map((node): DesignOp => ({
      op: "update-node",
      id: node.id,
      patch: { groupId: null },
    })),
  { op: "remove-group", id },
];
