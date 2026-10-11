import {
  derivedProps,
  ENGINE_FAMILIES,
  ENGINE_LABELS,
  isNodeKind,
} from "../catalogue";
import {
  type DesignEdge,
  type DesignGraph,
  type DesignGroup,
  type DesignNode,
  MAX_EDGES,
  MAX_GROUPS,
  MAX_NODES,
} from "../graph";
import { type OpRejection, reject, RejectedOp } from "./rejection";
import type { DesignOp, EdgePatch, GroupPatch, NodePatch } from "./schema";
import { assertValidEdge } from "./validate/edges";
import {
  assertFreeId,
  assertGroup,
  findEdge,
  findGroup,
  findNode,
} from "./validate/lookup";
import {
  assertNesting,
  assertPlacement,
  assertStoredOn,
} from "./validate/placement";
import {
  parseEdgeProps,
  parseNodeProps,
  parseTechnology,
} from "./validate/props";
import { assertRelationsOf } from "./validate/relations";

export type ApplyOpsResult =
  | { ok: true; graph: DesignGraph; inverse: DesignOp[]; applied: DesignOp[] }
  | OpRejection;

export interface ApplyOpsOptions {
  derive?: boolean;
}

interface Applied {
  inverse: DesignOp[];
  applied: DesignOp;
}

const pick = <T extends object>(
  source: T,
  keys: readonly string[],
): Partial<T> =>
  Object.fromEntries(
    keys.map((key) => [key, (source as Record<string, unknown>)[key]]),
  ) as Partial<T>;

const pickOrNull = (
  source: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> =>
  Object.fromEntries(keys.map((key) => [key, source[key] ?? null]));

const addNode = (
  graph: DesignGraph,
  node: DesignNode,
  derive: boolean,
): Applied => {
  if (!isNodeKind(node.kind)) {
    reject("invalid-op", `Unknown node kind ${String(node.kind)}`);
  }

  if (graph.nodes.length >= MAX_NODES) {
    reject("too-large", `A design holds at most ${MAX_NODES} nodes`);
  }

  assertFreeId(graph, node.id);
  assertGroup(graph, node.groupId);
  assertPlacement(graph, node);

  const technology = parseTechnology(node, node.technology);

  const added = {
    ...structuredClone(node),
    props: parseNodeProps(node, {
      ...(node.props as Record<string, unknown>),
      ...(derive ? derivedProps(node.kind, technology) : {}),
    }),
    technology,
  } as DesignNode;

  graph.nodes.push(added);

  return {
    inverse: [{ op: "remove-node", id: node.id }],
    applied: { op: "add-node", node: structuredClone(added) },
  };
};

const removeNode = (graph: DesignGraph, id: string): DesignOp[] => {
  const node = findNode(graph, id);
  const edges = graph.edges.filter(
    (edge) => edge.from === id || edge.to === id,
  );
  const stored = graph.groups.filter((group) => group.storedOn === id);

  for (const group of stored) delete group.storedOn;

  graph.nodes = graph.nodes.filter((candidate) => candidate.id !== id);
  graph.edges = graph.edges.filter(
    (edge) => edge.from !== id && edge.to !== id,
  );

  return [
    { op: "add-node", node },
    ...edges.map((edge): DesignOp => ({ op: "add-edge", edge })),
    ...stored.map((group): DesignOp => ({
      op: "update-group",
      id: group.id,
      patch: { storedOn: id },
    })),
  ];
};

const updateNode = (
  graph: DesignGraph,
  id: string,
  patch: NodePatch,
  derive: boolean,
): Applied => {
  const node = findNode(graph, id);
  const previous: NodePatch = {};

  if (patch.label !== undefined) {
    previous.label = node.label;
    node.label = patch.label;
  }

  if (patch.notes !== undefined) {
    previous.notes = node.notes;
    node.notes = patch.notes;
  }

  if (patch.groupId !== undefined) {
    assertGroup(graph, patch.groupId);
    previous.groupId = node.groupId;
    node.groupId = patch.groupId;
    assertPlacement(graph, node);
  }

  if (patch.technology !== undefined) {
    const technology = parseTechnology(node, patch.technology);

    previous.technology = node.technology;
    node.technology = technology;
  }

  const before = node.props as Record<string, unknown>;
  let props = before;

  if (patch.props !== undefined) {
    const merged: Record<string, unknown> = { ...props, ...patch.props };

    for (const [key, value] of Object.entries(patch.props)) {
      if (value === null) delete merged[key];
    }

    props = parseNodeProps(node, merged);
  }

  const derived = derive ? derivedProps(node.kind, node.technology) : {};

  if (Object.keys(derived).length > 0) {
    props = parseNodeProps(node, { ...props, ...derived });
  }

  const changed = Object.keys(props).filter(
    (key) => JSON.stringify(props[key]) !== JSON.stringify(before[key]),
  );

  const applied: NodePatch = { ...patch };

  if (patch.props !== undefined || changed.length > 0) {
    const keys = [...new Set([...Object.keys(patch.props ?? {}), ...changed])];

    previous.props = pickOrNull(before, keys);
    applied.props = pickOrNull(props, keys);
    node.props = props as DesignNode["props"];
    assertRelationsOf(graph, id);
  }

  return {
    inverse: [{ op: "update-node", id, patch: previous }],
    applied: { op: "update-node", id, patch: applied },
  };
};

const addEdge = (graph: DesignGraph, edge: DesignEdge): DesignOp[] => {
  if (graph.edges.length >= MAX_EDGES) {
    reject("too-large", `A design holds at most ${MAX_EDGES} edges`);
  }

  assertFreeId(graph, edge.id);

  const added = {
    ...structuredClone(edge),
    props: parseEdgeProps(edge, edge.props),
  };

  assertValidEdge(graph, added);
  graph.edges.push(added);

  return [{ op: "remove-edge", id: edge.id }];
};

const removeEdge = (graph: DesignGraph, id: string): DesignOp[] => {
  const edge = findEdge(graph, id);

  graph.edges = graph.edges.filter((candidate) => candidate.id !== id);

  return [{ op: "add-edge", edge }];
};

const updateEdge = (
  graph: DesignGraph,
  id: string,
  patch: EdgePatch,
): DesignOp[] => {
  const edge = findEdge(graph, id);
  const next: DesignEdge = {
    ...edge,
    label: patch.label ?? edge.label,
    kind: patch.kind ?? edge.kind,
    props: patch.props
      ? parseEdgeProps(edge, { ...edge.props, ...patch.props })
      : edge.props,
  };

  if (patch.connection === null) delete next.connection;
  else if (patch.connection !== undefined) next.connection = patch.connection;

  const relationPatch = patch.relation;

  if (relationPatch !== undefined && Object.keys(relationPatch).length > 0) {
    const current =
      edge.relation ??
      reject(
        "invalid-edge",
        `Edge ${edge.id} is a ${edge.kind}; only a relation has rules for deletes and updates`,
      );
    const updated: Record<string, unknown> = { ...current };

    for (const [key, value] of Object.entries(relationPatch)) {
      if (value === null) delete updated[key];
      else if (value !== undefined) updated[key] = value;
    }

    next.relation = updated as typeof current;
  }

  assertValidEdge(graph, next);

  const previous: EdgePatch = {
    ...(patch.label !== undefined ? { label: edge.label } : {}),
    ...(patch.kind !== undefined ? { kind: edge.kind } : {}),
    ...(patch.props !== undefined
      ? { props: pick(edge.props, Object.keys(patch.props)) }
      : {}),
    ...(patch.connection !== undefined
      ? { connection: edge.connection ?? null }
      : {}),
    ...(patch.relation !== undefined && edge.relation
      ? {
          relation: Object.fromEntries(
            Object.keys(patch.relation).map((key) => [
              key,
              (edge.relation as Record<string, unknown>)[key] ?? null,
            ]),
          ),
        }
      : {}),
  };

  Object.assign(edge, next);

  if (next.connection === undefined) delete edge.connection;

  return [{ op: "update-edge", id, patch: previous }];
};

const addGroup = (graph: DesignGraph, group: DesignGroup): DesignOp[] => {
  if (graph.groups.length >= MAX_GROUPS) {
    reject("too-large", `A design holds at most ${MAX_GROUPS} groups`);
  }

  assertFreeId(graph, group.id);
  assertGroup(graph, group.parentId);
  assertNesting(graph, group);
  assertStoredOn(graph, group);
  graph.groups.push(structuredClone(group));

  return [{ op: "remove-group", id: group.id }];
};

const removeGroup = (graph: DesignGraph, id: string): DesignOp[] => {
  const group = findGroup(graph, id);

  const occupied =
    graph.nodes.some((node) => node.groupId === id) ||
    graph.groups.some((child) => child.parentId === id);

  if (occupied) {
    reject("group-not-empty", `Group ${id} still holds nodes or groups`);
  }

  graph.groups = graph.groups.filter((candidate) => candidate.id !== id);

  return [{ op: "add-group", group }];
};

const updateGroup = (
  graph: DesignGraph,
  id: string,
  patch: GroupPatch,
): DesignOp[] => {
  const group = findGroup(graph, id);
  const previous: GroupPatch = {};

  if (patch.label !== undefined) {
    previous.label = group.label;
    group.label = patch.label;
  }

  if (patch.engine !== undefined) {
    const current =
      group.engine ??
      reject(
        "invalid-op",
        `Group ${id} is a ${group.kind}; only a database has an engine`,
      );

    if (ENGINE_FAMILIES[patch.engine] !== ENGINE_FAMILIES[current]) {
      reject(
        "invalid-op",
        `${group.label || id} is a ${ENGINE_LABELS[current]} database; it can change only to another engine of its kind`,
      );
    }

    previous.engine = current;
    group.engine = patch.engine;
  }

  if (patch.storedOn !== undefined) {
    const before = group.storedOn ?? null;

    if (patch.storedOn === null) delete group.storedOn;
    else group.storedOn = patch.storedOn;

    assertStoredOn(graph, group);
    previous.storedOn = before;
  }

  return [{ op: "update-group", id, patch: previous }];
};

const unchanged = (op: DesignOp, inverse: DesignOp[]): Applied => ({
  inverse,
  applied: op,
});

const applyOne = (
  graph: DesignGraph,
  op: DesignOp,
  derive: boolean,
): Applied => {
  switch (op.op) {
    case "add-node":
      return addNode(graph, op.node, derive);
    case "remove-node":
      return unchanged(op, removeNode(graph, op.id));
    case "update-node":
      return updateNode(graph, op.id, op.patch, derive);
    case "add-edge":
      return unchanged(op, addEdge(graph, op.edge));
    case "remove-edge":
      return unchanged(op, removeEdge(graph, op.id));
    case "update-edge":
      return unchanged(op, updateEdge(graph, op.id, op.patch));
    case "add-group":
      return unchanged(op, addGroup(graph, op.group));
    case "remove-group":
      return unchanged(op, removeGroup(graph, op.id));
    case "update-group":
      return unchanged(op, updateGroup(graph, op.id, op.patch));
  }
};

export const applyOps = (
  graph: DesignGraph,
  ops: readonly DesignOp[],
  { derive = true }: ApplyOpsOptions = {},
): ApplyOpsResult => {
  const draft = structuredClone(graph);
  const inverse: DesignOp[][] = [];
  const applied: DesignOp[] = [];

  for (const [index, op] of ops.entries()) {
    try {
      const result = applyOne(draft, op, derive);

      inverse.push(result.inverse);
      applied.push(result.applied);
    } catch (error) {
      if (!(error instanceof RejectedOp)) throw error;

      return { ok: false, index, reason: error.reason, message: error.message };
    }
  }

  return {
    ok: true,
    graph: draft,
    inverse: structuredClone(inverse.reverse().flat()),
    applied: structuredClone(applied),
  };
};
