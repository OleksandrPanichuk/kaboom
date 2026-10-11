import {
  catalogue,
  createNode,
  type DesignGraph,
  type DesignGroup,
  type DesignNode,
  type DesignOp,
  type NodeKind,
} from "@repo/design";

const shortId = (): string => crypto.randomUUID().slice(0, 8);

export const uniqueLabel = (graph: DesignGraph, base: string): string => {
  const taken = new Set(graph.nodes.map((node) => node.label));

  if (!taken.has(base)) return base;

  let suffix = 2;

  while (taken.has(`${base} ${suffix}`)) suffix += 1;

  return `${base} ${suffix}`;
};

export const newNode = (graph: DesignGraph, kind: NodeKind): DesignNode => {
  const node = createNode(kind, {
    id: `${kind}-${shortId()}`,
    label: uniqueLabel(graph, catalogue[kind].label),
  });

  if (node.kind === "table") {
    node.props.columns = [
      {
        id: "id",
        name: "id",
        type: "bigint",
        nullable: false,
        primaryKey: true,
        unique: false,
      },
    ];
  }

  return node;
};

export const homeOps = (graph: DesignGraph, node: DesignNode): DesignOp[] => {
  if (node.kind !== "collection") return [{ op: "add-node", node }];

  const existing = graph.groups.find(
    (group) => group.kind === "database" && group.engine === "mongodb",
  );
  const database: DesignGroup = existing ?? {
    id: `database-${shortId()}`,
    kind: "database",
    label: "Documents",
    parentId: null,
    engine: "mongodb",
  };

  return [
    ...(existing ? [] : [{ op: "add-group" as const, group: database }]),
    { op: "add-node", node: { ...node, groupId: database.id } },
  ];
};
