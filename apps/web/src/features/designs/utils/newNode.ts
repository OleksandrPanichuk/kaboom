import {
  catalogue,
  createNode,
  type DesignGraph,
  type DesignNode,
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
