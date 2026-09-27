import {
  carriesLoad,
  catalogue,
  EdgePropsSchema,
  findTechnology,
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
import type { DesignOp, EdgePatch, NodePatch } from "./schema";

export type ApplyOpsResult =
  { ok: true; graph: DesignGraph; inverse: DesignOp[] } | OpRejection;

const idTaken = (graph: DesignGraph, id: string): boolean =>
  graph.nodes.some((node) => node.id === id) ||
  graph.edges.some((edge) => edge.id === id) ||
  graph.groups.some((group) => group.id === id);

const assertFreeId = (graph: DesignGraph, id: string): void => {
  if (idTaken(graph, id)) reject("duplicate-id", `Id ${id} is already in use`);
};

const findNode = (graph: DesignGraph, id: string): DesignNode =>
  graph.nodes.find((node) => node.id === id) ??
  reject("unknown-node", `No node ${id}`);

const findEdge = (graph: DesignGraph, id: string): DesignEdge =>
  graph.edges.find((edge) => edge.id === id) ??
  reject("unknown-edge", `No edge ${id}`);

const findGroup = (graph: DesignGraph, id: string): DesignGroup =>
  graph.groups.find((group) => group.id === id) ??
  reject("unknown-group", `No group ${id}`);

const assertGroup = (graph: DesignGraph, groupId: string | null): void => {
  if (groupId !== null) findGroup(graph, groupId);
};

const parseNodeProps = (
  node: DesignNode,
  props: unknown,
): DesignNode["props"] => {
  const result = catalogue[node.kind].props.safeParse(props);

  if (!result.success) {
    reject(
      "invalid-props",
      `Props of ${node.id}: ${result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
    );
  }

  return result.data!;
};

const parseTechnology = (
  node: DesignNode,
  technology: DesignNode["technology"],
): DesignNode["technology"] => {
  if (technology === null) return null;

  const definition = findTechnology(technology.id, node.kind);

  if (!definition) {
    return reject(
      "unknown-technology",
      `No technology ${technology.id} for a ${node.kind}`,
    );
  }

  const result = definition.props.safeParse(technology.props);

  if (!result.success) {
    return reject(
      "invalid-props",
      `Technology props of ${node.id}: ${result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
    );
  }

  return { id: technology.id, props: result.data };
};

const parseEdgeProps = (
  edge: DesignEdge,
  props: unknown,
): DesignEdge["props"] => {
  const result = EdgePropsSchema.safeParse(props);

  if (!result.success) {
    reject("invalid-props", `Props of edge ${edge.id} are invalid`);
  }

  return result.data!;
};

const reaches = (
  graph: DesignGraph,
  from: string,
  target: string,
  ignoring: string,
): boolean => {
  const seen = new Set<string>();
  const stack = [from];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (current === target) return true;
    if (seen.has(current)) continue;

    seen.add(current);

    for (const edge of graph.edges) {
      if (
        edge.id !== ignoring &&
        edge.from === current &&
        carriesLoad(edge.kind)
      ) {
        stack.push(edge.to);
      }
    }
  }

  return false;
};

const assertValidEdge = (graph: DesignGraph, edge: DesignEdge): void => {
  const from = findNode(graph, edge.from);
  const to = findNode(graph, edge.to);

  if (from.id === to.id) {
    reject("invalid-edge", `Edge ${edge.id} connects ${from.id} to itself`);
  }

  if (to.kind === "client" || to.kind === "scheduler") {
    reject(
      "invalid-edge",
      `Edge ${edge.id} ends at ${to.id}, a ${to.kind}; it starts work and nothing calls it`,
    );
  }

  if ((edge.kind === "lock") !== (to.kind === "coordination")) {
    reject(
      "invalid-edge",
      edge.kind === "lock"
        ? `Edge ${edge.id} takes a lock on ${to.id}, a ${to.kind}; locks are taken on a coordination service`
        : `Edge ${edge.id} ends at ${to.id}, a coordination service; it only hands out locks`,
    );
  }

  if (
    edge.kind === "change-feed" &&
    from.kind !== "sql-database" &&
    from.kind !== "nosql-database"
  ) {
    reject(
      "invalid-edge",
      `Edge ${edge.id} is a change feed from ${from.id}, a ${from.kind}; only a database publishes one`,
    );
  }

  if (edge.kind === "replication") {
    if (from.kind !== to.kind || !catalogue[from.kind].replicable) {
      reject(
        "invalid-edge",
        `Edge ${edge.id} replicates ${from.kind} to ${to.kind}; replication joins two stores of one replicable kind`,
      );
    }
  }

  const duplicate = graph.edges.some(
    (other) =>
      other.id !== edge.id &&
      other.from === edge.from &&
      other.to === edge.to &&
      other.kind === edge.kind,
  );

  if (duplicate) {
    reject(
      "invalid-edge",
      `A ${edge.kind} edge from ${edge.from} to ${edge.to} already exists`,
    );
  }

  if (carriesLoad(edge.kind) && reaches(graph, edge.to, edge.from, edge.id)) {
    reject(
      "load-cycle",
      `Edge ${edge.id} closes a cycle: ${edge.to} already reaches ${edge.from}`,
    );
  }
};

const pick = <T extends object>(
  source: T,
  keys: readonly string[],
): Partial<T> =>
  Object.fromEntries(
    keys.map((key) => [key, (source as Record<string, unknown>)[key]]),
  ) as Partial<T>;

const addNode = (graph: DesignGraph, node: DesignNode): DesignOp[] => {
  if (!isNodeKind(node.kind)) {
    reject("invalid-op", `Unknown node kind ${String(node.kind)}`);
  }

  if (graph.nodes.length >= MAX_NODES) {
    reject("too-large", `A design holds at most ${MAX_NODES} nodes`);
  }

  assertFreeId(graph, node.id);
  assertGroup(graph, node.groupId);

  graph.nodes.push({
    ...structuredClone(node),
    props: parseNodeProps(node, node.props),
    technology: parseTechnology(node, node.technology),
  } as DesignNode);

  return [{ op: "remove-node", id: node.id }];
};

const removeNode = (graph: DesignGraph, id: string): DesignOp[] => {
  const node = findNode(graph, id);
  const edges = graph.edges.filter(
    (edge) => edge.from === id || edge.to === id,
  );

  graph.nodes = graph.nodes.filter((candidate) => candidate.id !== id);
  graph.edges = graph.edges.filter(
    (edge) => edge.from !== id && edge.to !== id,
  );

  return [
    { op: "add-node", node },
    ...edges.map((edge): DesignOp => ({ op: "add-edge", edge })),
  ];
};

const updateNode = (
  graph: DesignGraph,
  id: string,
  patch: NodePatch,
): DesignOp[] => {
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
  }

  if (patch.technology !== undefined) {
    const technology = parseTechnology(node, patch.technology);

    previous.technology = node.technology;
    node.technology = technology;
  }

  if (patch.props !== undefined) {
    const props = parseNodeProps(node, { ...node.props, ...patch.props });

    previous.props = pick(node.props, Object.keys(patch.props));
    node.props = props;
  }

  return [{ op: "update-node", id, patch: previous }];
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

  assertValidEdge(graph, next);

  const previous: EdgePatch = {
    ...(patch.label !== undefined ? { label: edge.label } : {}),
    ...(patch.kind !== undefined ? { kind: edge.kind } : {}),
    ...(patch.props !== undefined
      ? { props: pick(edge.props, Object.keys(patch.props)) }
      : {}),
  };

  Object.assign(edge, next);

  return [{ op: "update-edge", id, patch: previous }];
};

const addGroup = (graph: DesignGraph, group: DesignGroup): DesignOp[] => {
  if (graph.groups.length >= MAX_GROUPS) {
    reject("too-large", `A design holds at most ${MAX_GROUPS} groups`);
  }

  assertFreeId(graph, group.id);
  assertGroup(graph, group.parentId);
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

const applyOne = (graph: DesignGraph, op: DesignOp): DesignOp[] => {
  switch (op.op) {
    case "add-node":
      return addNode(graph, op.node);
    case "remove-node":
      return removeNode(graph, op.id);
    case "update-node":
      return updateNode(graph, op.id, op.patch);
    case "add-edge":
      return addEdge(graph, op.edge);
    case "remove-edge":
      return removeEdge(graph, op.id);
    case "update-edge":
      return updateEdge(graph, op.id, op.patch);
    case "add-group":
      return addGroup(graph, op.group);
    case "remove-group":
      return removeGroup(graph, op.id);
  }
};

export const applyOps = (
  graph: DesignGraph,
  ops: readonly DesignOp[],
): ApplyOpsResult => {
  const draft = structuredClone(graph);
  const inverse: DesignOp[][] = [];

  for (const [index, op] of ops.entries()) {
    try {
      inverse.push(applyOne(draft, op));
    } catch (error) {
      if (!(error instanceof RejectedOp)) throw error;

      return { ok: false, index, reason: error.reason, message: error.message };
    }
  }

  return {
    ok: true,
    graph: draft,
    inverse: structuredClone(inverse.reverse().flat()),
  };
};
