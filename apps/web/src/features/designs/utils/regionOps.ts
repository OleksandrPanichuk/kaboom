import {
  type DesignGraph,
  type DesignGroup,
  type DesignOp,
  GROUP_KIND_LABELS,
  type GroupKind,
} from "@repo/design";

import {
  NEW_PRIVATE_SUBNET,
  NEW_PUBLIC_SUBNET,
  NEW_REGION,
  type RegionTarget,
} from "@/features/properties";

const SUBNET_KINDS = new Set<GroupKind>(["public-subnet", "private-subnet"]);

export const regionsOf = (graph: DesignGraph): DesignGroup[] =>
  graph.groups.filter((group) => group.kind === "region");

export const subnetsOf = (graph: DesignGraph): DesignGroup[] =>
  graph.groups.filter((group) => SUBNET_KINDS.has(group.kind));

const nextLabel = (graph: DesignGraph, kind: GroupKind): string => {
  const base = GROUP_KIND_LABELS[kind];
  const taken = new Set(graph.groups.map((group) => group.label));
  let index = graph.groups.filter((group) => group.kind === kind).length + 1;

  while (taken.has(`${base} ${index}`)) index++;

  return `${base} ${index}`;
};

const newGroup = (
  graph: DesignGraph,
  kind: GroupKind,
  parentId: string | null,
): DesignGroup => ({
  id: `${kind}-${crypto.randomUUID().slice(0, 8)}`,
  kind,
  label: nextLabel(graph, kind),
  parentId,
});

export const emptiedRegionOps = (
  graph: DesignGraph,
  leaving: ReadonlySet<string>,
  keep: ReadonlySet<string> = new Set(),
  gone: ReadonlySet<string> = new Set(),
): DesignOp[] => {
  const removed = new Set<string>(gone);
  const holds = (group: DesignGroup) =>
    graph.nodes.some((node) => node.groupId === group.id) ||
    graph.groups.some((child) => child.parentId === group.id);
  const emptied = (group: DesignGroup) =>
    !keep.has(group.id) &&
    holds(group) &&
    graph.nodes.every(
      (node) => node.groupId !== group.id || leaving.has(node.id),
    ) &&
    graph.groups.every(
      (child) => child.parentId !== group.id || removed.has(child.id),
    );
  const ops: DesignOp[] = [];
  let found = true;

  while (found) {
    found = false;

    for (const group of graph.groups) {
      if (!removed.has(group.id) && emptied(group)) {
        removed.add(group.id);
        ops.push({ op: "remove-group", id: group.id });
        found = true;
      }
    }
  }

  return ops;
};

const targetGroup = (
  graph: DesignGraph,
  target: RegionTarget,
): { created: DesignGroup[]; groupId: string | null } => {
  if (target === NEW_REGION) {
    const region = newGroup(graph, "region", null);

    return { created: [region], groupId: region.id };
  }

  if (target === NEW_PUBLIC_SUBNET || target === NEW_PRIVATE_SUBNET) {
    const existing = graph.groups.find((group) => group.kind === "vpc");
    const vpc = existing ?? newGroup(graph, "vpc", null);
    const subnet = newGroup(
      { ...graph, groups: [...graph.groups, vpc] },
      target === NEW_PUBLIC_SUBNET ? "public-subnet" : "private-subnet",
      vpc.id,
    );

    return {
      created: existing ? [subnet] : [vpc, subnet],
      groupId: subnet.id,
    };
  }

  return { created: [], groupId: target };
};

const ancestorsOf = (
  groups: readonly DesignGroup[],
  id: string | null,
): Set<string> => {
  const found = new Set<string>();
  let current = groups.find((group) => group.id === id);

  while (current && !found.has(current.id)) {
    found.add(current.id);
    current = groups.find((group) => group.id === current!.parentId);
  }

  return found;
};

export const placementOps = (
  graph: DesignGraph,
  nodeIds: readonly string[],
  target: RegionTarget,
): DesignOp[] => {
  const { created, groupId } = targetGroup(graph, target);
  const moving = graph.nodes.filter(
    (node) => nodeIds.includes(node.id) && node.groupId !== groupId,
  );

  if (moving.length === 0) return [];

  return [
    ...created.map((group): DesignOp => ({ op: "add-group", group })),
    ...moving.map((node): DesignOp => ({
      op: "update-node",
      id: node.id,
      patch: { groupId },
    })),
    ...emptiedRegionOps(
      graph,
      new Set(moving.map((node) => node.id)),
      ancestorsOf([...graph.groups, ...created], groupId),
    ),
  ];
};

export const dissolveRegionOps = (
  graph: DesignGraph,
  id: string,
): DesignOp[] => {
  const within = (groupId: string): string[] => [
    ...graph.groups
      .filter((group) => group.parentId === groupId)
      .flatMap((group) => within(group.id)),
    groupId,
  ];
  const doomed = within(id);

  return [
    ...graph.nodes
      .filter((node) => node.groupId !== null && doomed.includes(node.groupId))
      .map((node): DesignOp => ({
        op: "update-node",
        id: node.id,
        patch: { groupId: null },
      })),
    ...doomed.map((groupId): DesignOp => ({ op: "remove-group", id: groupId })),
    ...emptiedRegionOps(
      graph,
      new Set(
        graph.nodes
          .filter(
            (node) => node.groupId !== null && doomed.includes(node.groupId),
          )
          .map((node) => node.id),
      ),
      new Set(),
      new Set(doomed),
    ),
  ];
};
