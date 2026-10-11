import z from "zod";

import {
  ChaosSettingsSchema,
  DrillSchema,
  HintSchema,
  InterviewContentSchema,
  MAX_HINTS,
  RubricItemSchema,
} from "./schema";

export const AUTHORING_SECTIONS = [
  "drills",
  "rubric",
  "hints",
  "interview",
  "chaos",
] as const;

export type AuthoringSection = (typeof AUTHORING_SECTIONS)[number];

export type JsonSchema = Record<string, unknown>;

const SECTIONS: Readonly<Record<AuthoringSection, z.ZodType>> = {
  drills: z
    .array(DrillSchema.meta({ title: "Drill" }))
    .min(1)
    .max(20),
  rubric: z
    .array(RubricItemSchema.meta({ title: "Rubric item" }))
    .min(1)
    .max(40),
  hints: z.array(HintSchema.meta({ title: "Hint" })).max(MAX_HINTS),
  interview: InterviewContentSchema,
  chaos: ChaosSettingsSchema,
};

const cache = new Map<AuthoringSection, JsonSchema>();

export const authoringSchema = (section: AuthoringSection): JsonSchema => {
  const known = cache.get(section);

  if (known) return known;

  const { $schema: _, ...schema } = z.toJSONSchema(SECTIONS[section], {
    io: "input",
    unrepresentable: "any",
  }) as JsonSchema;

  cache.set(section, schema);

  return schema;
};
