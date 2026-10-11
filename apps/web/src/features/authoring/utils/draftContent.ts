import {
  DRAFT_SECTIONS,
  type DraftSectionId,
} from "@/features/authoring/constants";

export type DraftContent = Record<string, unknown>;

export type IssuePath = ReadonlyArray<string | number>;

export const asContent = (value: unknown): DraftContent =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as DraftContent)
    : {};

export const textOf = (content: DraftContent, key: string): string => {
  const value = content[key];

  return typeof value === "string" ? value : "";
};

export const sectionOf = (path: IssuePath): DraftSectionId => {
  const [first] = path;
  const section = DRAFT_SECTIONS.find((item) =>
    (item.keys as readonly string[]).includes(String(first)),
  );

  return section?.id ?? "details";
};

export const formatPath = (path: IssuePath): string =>
  path
    .map((part, index) =>
      typeof part === "number" ? `[${part}]` : index === 0 ? part : `.${part}`,
    )
    .join("");

export const withGraphsFrom = (
  local: DraftContent,
  server: DraftContent,
): DraftContent => ({
  ...local,
  baseline: server.baseline,
  reference: {
    ...asContent(local.reference),
    graph: asContent(server.reference).graph,
  },
});
