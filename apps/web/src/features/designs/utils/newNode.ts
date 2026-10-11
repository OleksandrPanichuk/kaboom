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

  if (node.kind === "dynamo-table") {
    node.props.keySchema = {
      attributes: [
        { id: "PK", name: "PK", type: "S" },
        { id: "SK", name: "SK", type: "S" },
      ],
      partitionKey: "PK",
      sortKey: "SK",
    };
  }

  return node;
};

export const homeOps = (graph: DesignGraph, node: DesignNode): DesignOp[] => {
  const home = catalogue[node.kind].home;

  if (!home?.required) return [{ op: "add-node", node }];

  const existing = graph.groups.find(
    (group) => group.kind === "database" && group.engine === home.engine,
  );
  const database: DesignGroup = existing ?? {
    id: `database-${shortId()}`,
    kind: "database",
    label: home.label,
    parentId: null,
    engine: home.engine,
  };

  return [
    ...(existing ? [] : [{ op: "add-group" as const, group: database }]),
    { op: "add-node", node: { ...node, groupId: database.id } },
  ];
};
