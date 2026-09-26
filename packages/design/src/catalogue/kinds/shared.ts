import z from "zod";

export const count = (fallback: number) =>
  z.number().int().min(1).max(10_000).default(fallback);

export const rate = (fallback: number) =>
  z.number().positive().max(100_000_000).default(fallback);

export const ratio = (fallback: number) =>
  z.number().min(0).max(1).default(fallback);

export const millis = (fallback: number) =>
  z.number().min(0).max(600_000).default(fallback);

export const Autoscale = z
  .strictObject({
    enabled: z.boolean().default(false),
    min: count(2),
    max: count(10),
    targetUtilisation: z.number().min(0.1).max(1).default(0.7),
  })
  .default({ enabled: false, min: 2, max: 10, targetUtilisation: 0.7 });
