import type { DocumentField } from "@repo/design";

export interface DocumentRow {
  path: string[];
  depth: number;
  field: DocumentField;
}

export const documentRows = (
  fields: readonly DocumentField[],
  depth = 0,
  prefix: string[] = [],
): DocumentRow[] =>
  fields.flatMap((field) => [
    { path: [...prefix, field.id], depth, field },
    ...documentRows(field.fields ?? [], depth + 1, [...prefix, field.id]),
  ]);

export const holdsIds = (field: DocumentField): boolean =>
  field.type === "objectId" ||
  (field.type === "array" && field.of === "objectId");

export const fieldTypeLabel = (field: DocumentField): string =>
  field.type === "array" ? `[${field.of ?? "?"}]` : field.type;
