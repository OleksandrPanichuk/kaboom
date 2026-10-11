import {
  carriesLoad,
  catalogue,
  derivedProps,
  EdgePropsSchema,
  ENGINE_FAMILIES,
  ENGINE_LABELS,
  type EngineFamily,
  fieldAt,
  findTechnology,
  isNodeKind,
} from "../catalogue";
import { isKeyExactly, relationPairs } from "../data-model/tables";
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

const SUBNETS = new Set<DesignGroup["kind"]>([
  "public-subnet",
  "private-subnet",
]);

const assertNesting = (graph: DesignGraph, group: DesignGroup): void => {
  const parent =
    group.parentId === null ? null : findGroup(graph, group.parentId);

  if (SUBNETS.has(group.kind) && parent?.kind !== "vpc") {
    reject(
      "invalid-op",
      `Group ${group.id} is a subnet; a subnet sits inside a VPC`,
    );
  }

  if (group.kind === "vpc" && parent !== null && parent.kind !== "region") {
    reject(
      "invalid-op",
      `Group ${group.id} is a VPC; a VPC sits in a region or on its own`,
    );
  }

  if (group.kind === "region" && parent !== null) {
    reject(
      "invalid-op",
      `Group ${group.id} is a region; nothing holds a region`,
    );
  }

  if (
    group.kind === "database" &&
    parent !== null &&
    parent.kind !== "region"
  ) {
    reject(
      "invalid-op",
      `Group ${group.id} is a database; a database sits in a region or on its own`,
    );
  }

  if ((group.kind === "database") !== (group.engine !== undefined)) {
    reject(
      "invalid-op",
      group.kind === "database"
        ? `Database ${group.id} names no engine`
        : `Group ${group.id} is a ${group.kind}; only a database has an engine`,
    );
  }
};

const FAMILY_KINDS: Readonly<Record<EngineFamily, readonly string[]>> = {
  sql: ["table"],
  document: ["collection"],
  "key-value": ["dynamo-table"],
};

const FAMILY_HOLDS: Readonly<Record<EngineFamily, string>> = {
  sql: "tables",
  document: "collections",
  "key-value": "DynamoDB tables",
};

const ENGINE_ONLY: Readonly<Record<string, EngineFamily>> = {
  collection: "document",
  "dynamo-table": "key-value",
};

const assertPlacement = (graph: DesignGraph, node: DesignNode): void => {
  const only = ENGINE_ONLY[node.kind];

  if (only !== undefined) {
    const home = graph.groups.find((group) => group.id === node.groupId);

    if (!home?.engine || ENGINE_FAMILIES[home.engine] !== only) {
      reject(
        "invalid-op",
        `${node.label || node.id} is a ${node.kind}; it lives in a ${only === "document" ? "MongoDB" : "DynamoDB"} database`,
      );
    }
  }

  if (node.groupId === null) return;

  const group = findGroup(graph, node.groupId);

  if (group.kind !== "database" || group.engine === undefined) return;

  const family = ENGINE_FAMILIES[group.engine];

  if (!FAMILY_KINDS[family].includes(node.kind)) {
    reject(
      "invalid-op",
      `${node.label || node.id} is a ${node.kind}; a ${ENGINE_LABELS[group.engine]} database holds ${FAMILY_HOLDS[family]}`,
    );
  }
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

  if (from.id === to.id && edge.kind !== "relation") {
    reject("invalid-edge", `Edge ${edge.id} connects ${from.id} to itself`);
  }

  if (edge.kind !== "reference" && edge.reference !== undefined) {
    reject(
      "invalid-edge",
      `Edge ${edge.id} is a ${edge.kind}; only a reference starts at a field`,
    );
  }

  if (edge.kind !== "relation" && edge.relation !== undefined) {
    reject(
      "invalid-edge",
      `Edge ${edge.id} is a ${edge.kind}; only a relation joins columns`,
    );
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

  assertControlEdge(graph, edge, from, to);

  const duplicate =
    edge.kind !== "relation" &&
    graph.edges.some(
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

const stagesAfter = (
  graph: DesignGraph,
  from: string,
  ignoring: string,
): Set<string> => {
  const seen = new Set<string>();
  const stack = [from];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (seen.has(current)) continue;

    seen.add(current);

    for (const edge of graph.edges) {
      if (
        edge.id !== ignoring &&
        edge.kind === "pipeline-next" &&
        edge.from === current
      ) {
        stack.push(edge.to);
      }
    }
  }

  return seen;
};

const assertControlEdge = (
  graph: DesignGraph,
  edge: DesignEdge,
  from: DesignNode,
  to: DesignNode,
): void => {
  switch (edge.kind) {
    case "mounts":
      if (
        from.kind !== "k8s-deployment" ||
        (to.kind !== "config-map" && to.kind !== "secret")
      ) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} mounts ${to.id}, a ${to.kind}, into ${from.id}, a ${from.kind}; a deployment mounts config maps and secrets`,
        );
      }
      return;
    case "scales":
      if (from.kind !== "hpa" || to.kind !== "k8s-deployment") {
        reject(
          "invalid-edge",
          `Edge ${edge.id} scales ${to.id}, a ${to.kind}, from ${from.id}, a ${from.kind}; a pod autoscaler scales a deployment`,
        );
      }
      if (
        graph.edges.some(
          (other) =>
            other.id !== edge.id &&
            other.kind === "scales" &&
            other.to === edge.to,
        )
      ) {
        reject(
          "invalid-edge",
          `${to.id} already has a pod autoscaler; two would fight over its replicas`,
        );
      }
      return;
    case "watches":
      if (from.kind !== "alert" || !catalogue[to.kind].carriesTraffic) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} watches ${to.id}, a ${to.kind}, from ${from.id}, a ${from.kind}; an alert watches a node that serves traffic`,
        );
      }
      return;
    case "scrapes":
      if (from.kind !== "monitoring" || !catalogue[to.kind].carriesTraffic) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} scrapes ${to.id}, a ${to.kind}, from ${from.id}, a ${from.kind}; monitoring scrapes a node that serves traffic`,
        );
      }
      return;
    case "pipeline-next":
      if (from.kind !== "pipeline-stage" || to.kind !== "pipeline-stage") {
        reject(
          "invalid-edge",
          `Edge ${edge.id} runs ${to.id}, a ${to.kind}, after ${from.id}, a ${from.kind}; a pipeline joins its stages`,
        );
      }
      if (stagesAfter(graph, edge.to, edge.id).has(edge.from)) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} closes a loop in the pipeline: ${to.id} already runs before ${from.id}`,
        );
      }
      return;
    case "publishes":
      if (from.kind !== "pipeline-stage" || to.kind !== "artifact-registry") {
        reject(
          "invalid-edge",
          `Edge ${edge.id} publishes from ${from.id}, a ${from.kind}, to ${to.id}, a ${to.kind}; a pipeline stage publishes to an artifact registry`,
        );
      }
      return;
    case "protects":
      if (
        from.kind !== "security-group" ||
        !catalogue[to.kind].carriesTraffic
      ) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} protects ${to.id}, a ${to.kind}, with ${from.id}, a ${from.kind}; a security group protects a node that serves traffic`,
        );
      }
      if (
        graph.edges.some(
          (other) =>
            other.id !== edge.id &&
            other.kind === "protects" &&
            other.to === edge.to,
        )
      ) {
        reject(
          "invalid-edge",
          `${to.id} already has a security group; give it one that admits everything it needs`,
        );
      }
      return;
    case "admits":
      if (
        from.kind !== "security-group" ||
        (to.kind !== "security-group" && !catalogue[to.kind].carriesTraffic)
      ) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} admits ${to.id}, a ${to.kind}, into ${from.id}, a ${from.kind}; a security group admits a node or the members of another security group`,
        );
      }
      return;
    case "relation":
      assertRelation(graph, edge, from, to);
      return;
    case "reference":
      assertReference(graph, edge, from, to);
      return;
    default:
      if (
        !catalogue[from.kind].carriesTraffic ||
        !catalogue[to.kind].carriesTraffic
      ) {
        const idle = catalogue[from.kind].carriesTraffic ? to : from;

        reject(
          "invalid-edge",
          `Edge ${edge.id} sends ${edge.kind} traffic through ${idle.id}, a ${idle.kind}; it serves no requests`,
        );
      }
  }
};

const assertRelation = (
  graph: DesignGraph,
  edge: DesignEdge,
  from: DesignNode,
  to: DesignNode,
): void => {
  if (from.kind !== "table" || to.kind !== "table") {
    return reject(
      "invalid-edge",
      `A relation joins two tables, and ${from.kind === "table" ? to.label || to.id : from.label || from.id} is a ${from.kind === "table" ? to.kind : from.kind}`,
    );
  }

  const relation =
    edge.relation ??
    reject(
      "invalid-edge",
      `Relation ${edge.id} names no columns; it joins a foreign key to the column it references`,
    );

  const pairs = relationPairs(relation).map((pair) => ({
    from:
      from.props.columns.find((column) => column.id === pair.fromColumn) ??
      reject(
        "invalid-edge",
        `Relation ${edge.id} starts at column ${pair.fromColumn}, which ${from.label || from.id} does not have`,
      ),
    to:
      to.props.columns.find((column) => column.id === pair.toColumn) ??
      reject(
        "invalid-edge",
        `Relation ${edge.id} references column ${pair.toColumn}, which ${to.label || to.id} does not have`,
      ),
  }));
  const foreignKeys = pairs.map((pair) => pair.from);
  const referenced = pairs.map((pair) => pair.to);
  const fromName = from.label || from.id;
  const toName = to.label || to.id;
  const listed = (columns: typeof foreignKeys) =>
    columns.length === 1
      ? columns[0]!.name
      : `(${columns.map((column) => column.name).join(", ")})`;

  if (
    new Set(foreignKeys.map((column) => column.id)).size !== pairs.length ||
    new Set(referenced.map((column) => column.id)).size !== pairs.length
  ) {
    reject(
      "invalid-edge",
      `Relation ${edge.id} names a column twice; each column of a composite key appears once`,
    );
  }

  if (
    !isKeyExactly(
      to,
      referenced.map((column) => column.id),
    )
  ) {
    reject(
      "invalid-edge",
      pairs.length === 1
        ? `${toName}.${referenced[0]!.name} is neither the primary key of ${toName} nor unique, so a foreign key cannot reference it`
        : `${toName}.${listed(referenced)} is neither the primary key of ${toName} nor a unique key, so a foreign key cannot reference it`,
    );
  }

  if (from.id === to.id && pairs.every((pair) => pair.from.id === pair.to.id)) {
    reject(
      "invalid-edge",
      `${fromName}.${listed(foreignKeys)} cannot reference itself`,
    );
  }

  const ids = new Set(foreignKeys.map((column) => column.id));
  const taken = graph.edges.some((other) => {
    if (
      other.id === edge.id ||
      other.kind !== "relation" ||
      other.from !== edge.from ||
      !other.relation
    ) {
      return false;
    }

    const theirs = relationPairs(other.relation).map((pair) => pair.fromColumn);

    return theirs.length === ids.size && theirs.every((id) => ids.has(id));
  });

  if (taken) {
    reject(
      "invalid-edge",
      pairs.length === 1
        ? `${fromName}.${foreignKeys[0]!.name} already references a table; a column is one foreign key`
        : `${fromName}.${listed(foreignKeys)} already references a table`,
    );
  }
};

const assertReference = (
  graph: DesignGraph,
  edge: DesignEdge,
  from: DesignNode,
  to: DesignNode,
): void => {
  if (from.kind !== "collection" || to.kind !== "collection") {
    return reject(
      "invalid-edge",
      `A reference joins two collections, and ${from.kind === "collection" ? to.label || to.id : from.label || from.id} is a ${from.kind === "collection" ? to.kind : from.kind}`,
    );
  }

  const reference =
    edge.reference ??
    reject(
      "invalid-edge",
      `Reference ${edge.id} names no field; it starts at the field that holds the other document's _id`,
    );
  const field =
    fieldAt(from.props.fields, reference.fromField) ??
    reject(
      "invalid-edge",
      `Reference ${edge.id} starts at ${reference.fromField.join(".")}, which ${from.label || from.id} does not have`,
    );
  const holdsIds =
    field.type === "objectId" ||
    (field.type === "array" && field.of === "objectId");

  if (!holdsIds) {
    reject(
      "invalid-edge",
      `${from.label || from.id}.${field.name} is a ${field.type === "array" ? `array of ${field.of}` : field.type}; a reference holds an objectId, or an array of them`,
    );
  }

  const path = reference.fromField.join("/");
  const taken = graph.edges.some(
    (other) =>
      other.id !== edge.id &&
      other.kind === "reference" &&
      other.from === edge.from &&
      other.reference?.fromField.join("/") === path,
  );

  if (taken) {
    reject(
      "invalid-edge",
      `${from.label || from.id}.${field.name} already references a collection`,
    );
  }
};

const assertRelationsOf = (graph: DesignGraph, nodeId: string): void => {
  for (const edge of graph.edges) {
    if (
      edge.kind === "reference" &&
      (edge.from === nodeId || edge.to === nodeId)
    ) {
      assertReference(
        graph,
        edge,
        findNode(graph, edge.from),
        findNode(graph, edge.to),
      );
    }

    if (
      edge.kind === "relation" &&
      (edge.from === nodeId || edge.to === nodeId)
    ) {
      assertRelation(
        graph,
        edge,
        findNode(graph, edge.from),
        findNode(graph, edge.to),
      );
    }
  }
};

const pick = <T extends object>(
  source: T,
  keys: readonly string[],
): Partial<T> =>
  Object.fromEntries(
    keys.map((key) => [key, (source as Record<string, unknown>)[key]]),
  ) as Partial<T>;

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
    props = parseNodeProps(node, { ...props, ...patch.props });
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

    previous.props = pick(before, keys);
    applied.props = pick(props, keys);
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

  return [{ op: "update-edge", id, patch: previous }];
};

const addGroup = (graph: DesignGraph, group: DesignGroup): DesignOp[] => {
  if (graph.groups.length >= MAX_GROUPS) {
    reject("too-large", `A design holds at most ${MAX_GROUPS} groups`);
  }

  assertFreeId(graph, group.id);
  assertGroup(graph, group.parentId);
  assertNesting(graph, group);
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
