export type JsonSchema = Record<string, unknown>;

export type FieldShape =
  | {
      kind: "object";
      properties: Record<string, JsonSchema>;
      required: string[];
    }
  | {
      kind: "array";
      items: JsonSchema;
      maxItems: number | null;
      minItems: number;
    }
  | { kind: "tuple"; items: JsonSchema[] }
  | { kind: "union"; options: JsonSchema[]; discriminator: string }
  | { kind: "nullable"; inner: JsonSchema }
  | { kind: "enum"; values: string[] }
  | { kind: "const"; value: unknown }
  | { kind: "string"; long: boolean; ref: string | null }
  | { kind: "number"; integer: boolean; min: number | null; max: number | null }
  | { kind: "boolean" }
  | { kind: "unknown" };

const record = (value: unknown): JsonSchema =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonSchema)
    : {};

const unionOf = (schema: JsonSchema): JsonSchema[] | null => {
  const options = schema.anyOf ?? schema.oneOf;

  return Array.isArray(options) ? options.map(record) : null;
};

export const discriminatorOf = (options: JsonSchema[]): string | null => {
  const first = record(options[0]?.properties);

  return (
    Object.keys(first).find((key) =>
      options.every(
        (option) => "const" in record(record(option.properties)[key]),
      ),
    ) ?? null
  );
};

export const shapeOf = (schema: JsonSchema): FieldShape => {
  const union = unionOf(schema);

  if (union) {
    const others = union.filter((option) => option.type !== "null");

    if (others.length === 1 && others.length < union.length) {
      return { kind: "nullable", inner: others[0]! };
    }

    const discriminator = discriminatorOf(union);

    return discriminator
      ? { kind: "union", options: union, discriminator }
      : { kind: "unknown" };
  }

  if ("const" in schema) return { kind: "const", value: schema.const };

  if (Array.isArray(schema.enum)) {
    return { kind: "enum", values: schema.enum.map(String) };
  }

  switch (schema.type) {
    case "object":
      return {
        kind: "object",
        properties: Object.fromEntries(
          Object.entries(record(schema.properties)).map(([key, value]) => [
            key,
            record(value),
          ]),
        ),
        required: Array.isArray(schema.required)
          ? schema.required.map(String)
          : [],
      };
    case "array":
      return Array.isArray(schema.prefixItems)
        ? { kind: "tuple", items: schema.prefixItems.map(record) }
        : {
            kind: "array",
            items: record(schema.items),
            maxItems:
              typeof schema.maxItems === "number" ? schema.maxItems : null,
            minItems: typeof schema.minItems === "number" ? schema.minItems : 0,
          };
    case "string":
      return {
        kind: "string",
        long: typeof schema.maxLength === "number" && schema.maxLength >= 500,
        ref: typeof schema.ref === "string" ? schema.ref : null,
      };
    case "number":
    case "integer": {
      const min =
        typeof schema.minimum === "number"
          ? schema.minimum
          : typeof schema.exclusiveMinimum === "number"
            ? schema.exclusiveMinimum
            : null;

      return {
        kind: "number",
        integer: schema.type === "integer",
        min,
        max: typeof schema.maximum === "number" ? schema.maximum : null,
      };
    }
    case "boolean":
      return { kind: "boolean" };
    default:
      return { kind: "unknown" };
  }
};

const ACRONYMS: Readonly<Record<string, string>> = {
  api: "API",
  cdn: "CDN",
  dns: "DNS",
  fk: "FK",
  id: "id",
  nat: "NAT",
  nosql: "NoSQL",
  slo: "SLO",
  spof: "SPOF",
  sql: "SQL",
  ttl: "TTL",
  vpc: "VPC",
};

export const humanize = (key: string): string => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => ACRONYMS[word] ?? word)
    .join(" ");

  return words.charAt(0).toUpperCase() + words.slice(1);
};

const UNIT_IN_TITLE = /\s*\((s|ms|\$|points)\)$/;

export const labelOf = (key: string, schema: JsonSchema): string =>
  typeof schema.title === "string"
    ? schema.title.replace(UNIT_IN_TITLE, "")
    : humanize(key);

export const singular = (label: string): string =>
  label.endsWith("ies")
    ? `${label.slice(0, -3)}y`
    : label.endsWith("s") && !label.endsWith("ss")
      ? label.slice(0, -1)
      : label;

const SCALARS = new Set(["string", "number", "enum", "boolean"]);

export const isFlatItem = (schema: JsonSchema): boolean => {
  const shape = shapeOf(schema);

  if (shape.kind !== "object") return false;

  const fields = Object.values(shape.properties).map(shapeOf);

  return (
    fields.length > 0 &&
    fields.length <= 4 &&
    fields.every(
      (field) =>
        SCALARS.has(field.kind) && !(field.kind === "string" && field.long),
    )
  );
};

export const descriptionOf = (schema: JsonSchema): string | null =>
  typeof schema.description === "string" ? schema.description : null;

export const optionLabel = (
  option: JsonSchema,
  discriminator: string,
): string => {
  if (typeof option.title === "string") return option.title;

  const value = record(record(option.properties)[discriminator]).const;

  return humanize(String(value));
};

export const exampleOf = (schema: JsonSchema): unknown =>
  Array.isArray(schema.examples) ? schema.examples[0] : undefined;

export const defaultOf = (schema: JsonSchema): unknown => {
  if ("default" in schema) return structuredClone(schema.default);
  if (exampleOf(schema) !== undefined) return exampleOf(schema);

  const shape = shapeOf(schema);

  switch (shape.kind) {
    case "object":
      return Object.fromEntries(
        Object.entries(shape.properties)
          .filter(
            ([key, value]) =>
              shape.required.includes(key) ||
              "const" in value ||
              "default" in value,
          )
          .map(([key, value]) => [key, defaultOf(value)]),
      );
    case "array":
      return Array.from({ length: shape.minItems }, () =>
        defaultOf(shape.items),
      );
    case "tuple":
      return shape.items.map(defaultOf);
    case "union":
      return defaultOf(shape.options[0]!);
    case "nullable":
      return null;
    case "enum":
      return shape.values[0];
    case "const":
      return shape.value;
    case "string":
      return "";
    case "number":
      return shape.min ?? 0;
    case "boolean":
      return false;
    default:
      return undefined;
  }
};

export const switchOption = (
  current: unknown,
  option: JsonSchema,
): Record<string, unknown> => {
  const fresh = record(defaultOf(option));
  const kept = record(current);
  const properties = record(option.properties);

  return {
    ...fresh,
    ...Object.fromEntries(
      Object.entries(kept).filter(
        ([key]) => key in properties && !("const" in record(properties[key])),
      ),
    ),
  };
};

export const optionIndex = (
  options: JsonSchema[],
  discriminator: string,
  value: unknown,
): number => {
  const tag = record(value)[discriminator];
  const index = options.findIndex(
    (option) => record(record(option.properties)[discriminator]).const === tag,
  );

  if (index >= 0) return index;

  const fallback = options.findIndex(
    (option) => "default" in record(record(option.properties)[discriminator]),
  );

  return fallback >= 0 ? fallback : 0;
};

export const samePath = (
  a: ReadonlyArray<string | number>,
  b: ReadonlyArray<string | number>,
): boolean =>
  a.length === b.length && a.every((part, index) => part === b[index]);

export const listOf = (value: unknown): unknown[] =>
  Array.isArray(value) ? (value as unknown[]) : [];

export const startsWith = (
  path: ReadonlyArray<string | number>,
  prefix: ReadonlyArray<string | number>,
): boolean =>
  prefix.length <= path.length &&
  prefix.every((part, index) => part === path[index]);
