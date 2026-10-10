import z from "zod";

export const PROP_UNITS = [
  "req/s",
  "msg/s",
  "ms",
  "s",
  "min",
  "h",
  "GB",
  "KB",
  "ratio",
  "count",
] as const;

export type PropUnit = (typeof PROP_UNITS)[number];

export const PROP_EDITORS = ["columns", "indexes"] as const;

export type PropEditor = (typeof PROP_EDITORS)[number];

export interface PropMeta {
  title: string;
  description?: string;
  unit?: PropUnit;
  advanced?: boolean;
  editor?: PropEditor;
}

export const prop = <Schema extends z.ZodType>(
  schema: Schema,
  meta: PropMeta,
): Schema => schema.meta({ ...meta });

export const propMeta = (schema: z.ZodType): PropMeta | undefined =>
  z.globalRegistry.get(schema) as PropMeta | undefined;

export interface PropField {
  key: string;
  schema: z.ZodType;
  meta: PropMeta;
}

export const describeProps = (props: z.ZodObject): PropField[] =>
  Object.entries(props.shape as Record<string, z.ZodType>).map(
    ([key, schema]) => {
      const meta = propMeta(schema);

      if (!meta) throw new Error(`Prop ${key} has no metadata`);

      return { key, schema, meta };
    },
  );

export type PropControl =
  | { type: "number"; min: number | null; max: number | null; integer: boolean }
  | { type: "boolean" }
  | { type: "choice"; options: readonly string[] }
  | { type: "text"; maxLength: number | null }
  | { type: "group"; fields: PropField[] }
  | { type: "custom"; editor: PropEditor };

const unwrap = (schema: z.ZodType): z.ZodType => {
  let current = schema;

  while (
    current instanceof z.ZodDefault ||
    current instanceof z.ZodOptional ||
    current instanceof z.ZodNullable
  ) {
    current = current.unwrap() as z.ZodType;
  }

  return current;
};

const finite = (value: number | null): number | null =>
  value !== null && Number.isFinite(value) ? value : null;

export const propControl = (schema: z.ZodType): PropControl => {
  const editor = propMeta(schema)?.editor;

  if (editor !== undefined) return { type: "custom", editor };

  const inner = unwrap(schema);

  if (inner instanceof z.ZodNumber) {
    return {
      type: "number",
      min: finite(inner.minValue),
      max: finite(inner.maxValue),
      integer: inner.isInt,
    };
  }

  if (inner instanceof z.ZodBoolean) return { type: "boolean" };

  if (inner instanceof z.ZodEnum) {
    return { type: "choice", options: inner.options as readonly string[] };
  }

  if (inner instanceof z.ZodString) {
    return { type: "text", maxLength: finite(inner.maxLength) };
  }

  if (inner instanceof z.ZodObject) {
    return { type: "group", fields: describeProps(inner) };
  }

  throw new Error("A prop has a schema no control can edit");
};
