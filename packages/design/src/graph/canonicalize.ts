import type { DesignGraph } from "./schema";

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;

    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, stable(record[key])]),
    );
  }

  return value;
};

const byId = <T extends { id: string }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export const canonicalize = (graph: DesignGraph): string =>
  JSON.stringify(
    stable({
      ...graph,
      nodes: byId(graph.nodes),
      edges: byId(graph.edges),
      groups: byId(graph.groups),
    }),
  );
