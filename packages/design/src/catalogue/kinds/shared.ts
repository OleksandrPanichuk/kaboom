import z from "zod";

import { prop, type PropMeta } from "../prop-meta";

type FieldMeta = Omit<PropMeta, "unit">;

export const count = (fallback: number, meta: FieldMeta) =>
  prop(z.number().int().min(1).max(10_000).default(fallback), {
    unit: "count",
    ...meta,
  });

export const rate = (
  fallback: number,
  meta: FieldMeta & { unit?: "req/s" | "msg/s" },
) =>
  prop(z.number().positive().max(100_000_000).default(fallback), {
    unit: "req/s",
    ...meta,
  });

export const ratio = (fallback: number, meta: FieldMeta) =>
  prop(z.number().min(0).max(1).default(fallback), { unit: "ratio", ...meta });

export const millis = (fallback: number, meta: FieldMeta) =>
  prop(z.number().min(0).max(600_000).default(fallback), {
    unit: "ms",
    ...meta,
  });

export const gigabytes = (fallback: number, meta: FieldMeta) =>
  prop(z.number().positive().max(10_000_000).default(fallback), {
    unit: "GB",
    ...meta,
  });

export const kilobytes = (fallback: number, meta: FieldMeta) =>
  prop(z.number().positive().max(100_000).default(fallback), {
    unit: "KB",
    ...meta,
  });

export const toggle = (fallback: boolean, meta: FieldMeta) =>
  prop(z.boolean().default(fallback), meta);

export const choice = <const Options extends readonly [string, ...string[]]>(
  options: Options,
  fallback: Options[number],
  meta: FieldMeta,
) => prop(z.enum(options).default(fallback), meta);

export const baseLatency = (fallback: number) =>
  millis(fallback, {
    title: "Base latency",
    description: "Time to serve one request when the node is idle",
  });

export const Autoscale = prop(
  z
    .strictObject({
      enabled: toggle(false, { title: "Enabled" }),
      min: count(2, { title: "Minimum replicas" }),
      max: count(10, { title: "Maximum replicas" }),
      targetUtilisation: prop(z.number().min(0.1).max(1).default(0.7), {
        title: "Target utilisation",
        description: "Scale out once busier than this for two steps in a row",
        unit: "ratio",
      }),
    })
    .default({ enabled: false, min: 2, max: 10, targetUtilisation: 0.7 }),
  {
    title: "Autoscaling",
    description: "Adds replicas under load, one simulation step late",
    advanced: true,
  },
);
