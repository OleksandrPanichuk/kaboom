import z from "zod";

export const PROP_UNITS = [
  "req/s",
  "msg/s",
  "ms",
  "s",
  "h",
  "GB",
  "KB",
  "ratio",
  "count",
] as const;

export type PropUnit = (typeof PROP_UNITS)[number];

export interface PropMeta {
  title: string;
  description?: string;
  unit?: PropUnit;
  advanced?: boolean;
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
