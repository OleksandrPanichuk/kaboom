import type { InterviewRubricItem } from "@repo/design";
import z from "zod";

import type { ReviewItem } from "../review.entity";
import type { Evidence } from "./evidence";

export const MAX_ITEM_SCORE = 3;

export const DraftItemSchema = z.object({
  key: z.string().describe("The rubric item's key"),
  score: z
    .number()
    .int()
    .min(0)
    .max(MAX_ITEM_SCORE)
    .describe("0 no evidence or wrong, 1 weak, 2 solid, 3 strong"),
  rationale: z
    .string()
    .min(1)
    .max(600)
    .describe("Two or three sentences, addressed to the candidate"),
  citations: z
    .array(z.string())
    .max(8)
    .describe("Labels of the evidence this score rests on, such as M4 or N2"),
});

export const ReviewDraftSchema = z.object({
  summary: z
    .string()
    .min(1)
    .max(1_500)
    .describe("How the interview went, in a short paragraph to the candidate"),
  strengths: z.array(z.string().min(1).max(300)).max(5),
  improvements: z
    .array(z.string().min(1).max(300))
    .max(5)
    .describe("What to practise next, most important first"),
  items: z.array(DraftItemSchema).max(20),
});

export const ItemsDraftSchema = z.object({
  items: z.array(DraftItemSchema).min(1).max(20),
});

export type DraftItem = z.infer<typeof DraftItemSchema>;

export type ReviewDraft = z.infer<typeof ReviewDraftSchema>;

export const problemWith = (
  item: DraftItem | undefined,
  evidence: Evidence,
): string | null => {
  if (!item) return "it has no score";

  const unknown = item.citations.filter(
    (label) => !evidence.byLabel.has(label),
  );

  if (unknown.length > 0)
    return `it cites ${unknown.join(", ")}, which do not exist`;

  if (item.score > 0 && item.citations.length === 0) {
    return "a score above 0 must cite the evidence it rests on";
  }

  return null;
};

export const toReviewItem = (
  rubric: InterviewRubricItem,
  item: DraftItem | undefined,
  evidence: Evidence,
): ReviewItem => {
  const problem = problemWith(item, evidence);
  const base = {
    key: rubric.key,
    title: rubric.title,
    dimension: rubric.dimension,
    weight: rubric.weight,
  };

  if (!item || problem) {
    return {
      ...base,
      score: null,
      rationale: `Not scored: the review model gave no valid score, because ${problem}.`,
      citations: [],
    };
  }

  return {
    ...base,
    score: item.score,
    rationale: item.rationale,
    citations: [...new Set(item.citations)].map((label) =>
      evidence.byLabel.get(label)!,
    ),
  };
};

export const rubricScore = (items: ReviewItem[]): number | null => {
  const scored = items.filter((item) => item.score !== null);
  const weight = scored.reduce((sum, item) => sum + item.weight, 0);

  if (weight === 0) return null;

  const earned = scored.reduce(
    (sum, item) => sum + (item.weight * item.score!) / MAX_ITEM_SCORE,
    0,
  );

  return Math.round((100 * earned) / weight);
};
