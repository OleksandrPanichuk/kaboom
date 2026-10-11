import { formatWithUnit, unitOf } from "./fieldUnits";
import {
  humanize,
  type JsonSchema,
  labelOf,
  optionIndex,
  optionLabel,
  shapeOf,
  singular,
} from "./schemaForm";

export interface ItemSummary {
  kind: string | null;
  title: string | null;
  id: string | null;
  aside: string | null;
  details: string[];
}

const TITLE_KEYS = ["title", "name", "topic"];
const ID_KEYS = ["id", "key"];
const ASIDE_KEYS = ["weight", "cost"];
const SKIPPED = new Set([
  ...TITLE_KEYS,
  ...ID_KEYS,
  ...ASIDE_KEYS,
  "description",
]);
const MAX_DETAILS = 4;

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

const resolve = (
  schema: JsonSchema,
  value: unknown,
): {
  schema: JsonSchema;
  kind: string | null;
  discriminator: string | null;
} => {
  const shape = shapeOf(schema);

  if (shape.kind !== "union") {
    return { schema, kind: null, discriminator: null };
  }

  const option =
    shape.options[optionIndex(shape.options, shape.discriminator, value)]!;

  return {
    schema: option,
    kind: optionLabel(option, shape.discriminator),
    discriminator: shape.discriminator,
  };
};

const detailsOf = (
  schema: JsonSchema,
  value: unknown,
  skip: ReadonlySet<string>,
  depth: number,
): string[] => {
  const shape = shapeOf(schema);

  if (shape.kind !== "object") return [];

  const current = record(value);

  const nestedLast = Object.entries(shape.properties).sort(
    ([, a], [, b]) =>
      Number(["object", "union"].includes(shapeOf(a).kind)) -
      Number(["object", "union"].includes(shapeOf(b).kind)),
  );

  return nestedLast.flatMap(([key, field]) => {
    if (skip.has(key)) return [];

    const entry = current[key];
    const inner = shapeOf(field);
    const label = labelOf(key, field);

    if (entry === undefined || entry === null) return [];

    if (inner.kind !== "number" && field.default === entry) return [];

    switch (inner.kind) {
      case "number": {
        if (typeof entry !== "number") return [];

        return [`${label} ${formatWithUnit(entry, unitOf(key, field))}`];
      }
      case "enum":
        return typeof entry === "string" ? [humanize(entry)] : [];
      case "boolean":
        return entry === true ? [label] : [];
      case "string":
        return inner.long || !text(entry) ? [] : [text(entry)!];
      case "array": {
        const count = Array.isArray(entry) ? entry.length : 0;
        const noun =
          typeof inner.items.title === "string" ? inner.items.title : null;

        if (count === 0) return [];

        return [
          count === 1
            ? `1 ${(noun ?? singular(label)).toLowerCase()}`
            : `${count} ${(noun ? `${noun}s` : label).toLowerCase()}`,
        ];
      }
      case "object":
      case "union": {
        if (depth >= 2) return [];

        const nested = resolve(field, entry);
        const own = nested.discriminator
          ? new Set([nested.discriminator])
          : new Set<string>();

        return [
          ...(nested.kind ? [nested.kind] : []),
          ...detailsOf(nested.schema, entry, own, depth + 1),
        ];
      }
      default:
        return [];
    }
  });
};

export const summaryOf = (schema: JsonSchema, value: unknown): ItemSummary => {
  const { schema: option, kind, discriminator } = resolve(schema, value);
  const current = record(value);
  const title = TITLE_KEYS.map((key) => text(current[key])).find(Boolean);
  const id = ID_KEYS.map((key) => text(current[key])).find(Boolean);
  const skip = new Set(SKIPPED);
  const asideKey = ASIDE_KEYS.find((key) => typeof current[key] === "number");
  const asideSchema = asideKey
    ? shapeOf(option).kind === "object"
      ? (option.properties as Record<string, JsonSchema>)[asideKey]
      : undefined
    : undefined;

  if (discriminator) skip.add(discriminator);

  return {
    kind,
    title: title ?? null,
    id: id ?? null,
    aside:
      asideKey && asideSchema
        ? formatWithUnit(
            current[asideKey] as number,
            unitOf(asideKey, asideSchema),
          )
        : null,
    details: detailsOf(option, value, skip, 0).slice(0, MAX_DETAILS),
  };
};
