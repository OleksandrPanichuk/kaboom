import { asContent, type DraftContent } from "./draftContent";

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const nodesOf = (content: DraftContent): Array<Record<string, unknown>> =>
  [content.baseline, asContent(content.reference).graph].flatMap((graph) =>
    list(asContent(graph).nodes).map(asContent),
  );

const unique = (values: unknown[]): string[] => [
  ...new Set(
    values.filter(
      (value): value is string => typeof value === "string" && value !== "",
    ),
  ),
];

export const draftRefs = (content: DraftContent): Record<string, string[]> => {
  const nodes = nodesOf(content);
  const ofKind = (kind: string) =>
    unique(nodes.filter((node) => node.kind === kind).map((node) => node.id));

  return {
    drill: unique(list(content.drills).map((drill) => asContent(drill).id)),
    table: ofKind("table"),
    collection: ofKind("collection"),
    item: unique(
      nodes
        .filter((node) => node.kind === "dynamo-table")
        .flatMap((node) => list(asContent(node.props).items))
        .map((item) => asContent(item).name),
    ),
  };
};
