import type { DesignGraph } from "@repo/design";

export interface DesignBundle {
  system: DesignGraph;
  schemas: Readonly<Record<string, DesignGraph>>;
}

export const bundleOf = (system: DesignGraph): DesignBundle => ({
  system,
  schemas: {},
});

export const schemaReferences = (system: DesignGraph): Map<string, string> => {
  const holders = new Map<string, string>();

  for (const node of system.nodes) {
    const designId = node.schema?.designId;

    if (designId && !holders.has(designId)) holders.set(designId, node.id);
  }

  return holders;
};

const idsOf = (graph: DesignGraph): string[] => [
  ...graph.nodes.map((node) => node.id),
  ...graph.edges.map((edge) => edge.id),
  ...graph.groups.map((group) => group.id),
];

export const bundleConflicts = ({
  system,
  schemas,
}: DesignBundle): string[] => {
  const seen = new Set(idsOf(system));
  const conflicts = new Set<string>();

  for (const designId of schemaReferences(system).keys()) {
    const schema = schemas[designId];

    if (!schema) continue;

    for (const id of idsOf(schema)) {
      if (seen.has(id)) conflicts.add(id);

      seen.add(id);
    }
  }

  return [...conflicts];
};

export const flattenBundle = (bundle: DesignBundle): DesignGraph => {
  const conflicts = bundleConflicts(bundle);

  if (conflicts.length > 0) {
    throw new Error(
      `The design and its schemas share the ids ${conflicts.join(", ")}`,
    );
  }

  return [...schemaReferences(bundle.system)].reduce<DesignGraph>(
    (graph, [designId, holder]) => {
      const schema = bundle.schemas[designId];

      if (!schema) return graph;

      return {
        ...graph,
        nodes: [...graph.nodes, ...schema.nodes],
        edges: [...graph.edges, ...schema.edges],
        groups: [
          ...graph.groups,
          ...schema.groups.map((group) =>
            group.kind === "database" && group.parentId === null
              ? { ...group, storedOn: holder }
              : group,
          ),
        ],
      };
    },
    bundle.system,
  );
};
