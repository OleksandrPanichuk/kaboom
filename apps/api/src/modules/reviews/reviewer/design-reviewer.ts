import type { DrillScore, ItemScore, ProblemContent } from "@repo/design";
import z from "zod";

import { getEnv } from "@/configs";
import { Service } from "@/core/service";
import type { DesignReview } from "@/modules/submissions";

import { REVIEW_PROMPT_VERSION } from "../reviews.constants";
import { ReviewModelError } from "../reviews.errors";
import { reviewTool, ToolConversation } from "./tool-conversation";

export const DESIGN_DIMENSIONS = ["design", "scaling", "reliability"] as const;

const DesignReviewSchema = z.object({
  summary: z.string().min(1).max(1_200),
  strengths: z.array(z.string().min(1).max(300)).max(5),
  improvements: z
    .array(z.string().min(1).max(300))
    .max(5)
    .describe("What would make the design better, most important first"),
  items: z
    .array(
      z.object({
        dimension: z.enum(DESIGN_DIMENSIONS),
        score: z
          .number()
          .int()
          .min(0)
          .max(3)
          .describe("0 missing or wrong, 1 weak, 2 solid, 3 strong"),
        rationale: z
          .string()
          .min(1)
          .max(600)
          .describe("What in the design the score rests on, naming its nodes"),
      }),
    )
    .length(DESIGN_DIMENSIONS.length),
});

const SUBMIT_DESIGN_REVIEW = reviewTool(
  "submit_design_review",
  "Submit the review of the design: a summary, strengths, improvements and one score for each of design, scaling and reliability.",
  DesignReviewSchema,
);

export const DESIGN_REVIEWER_PERSONA = `You are a staff engineer reviewing a system design someone submitted for a practice problem. There was no conversation: you judge the design on the canvas, which the solver will read your review against.

How you score
- Score three things from 0 to 3: design (the components and the data flow fit the problem), scaling (it carries the stated traffic and its peaks), and reliability (it survives the failures the problem names). 0 is missing or wrong, 1 weak, 2 solid, 3 strong.
- The automated checks and drills are facts about this design. Do not contradict them, but explain what they miss: why a choice is sound or fragile, and what a strong engineer would question.
- Name the nodes you mean by their labels.

What you write
- A summary of the design in one short paragraph.
- Up to five strengths and up to five improvements, each one concrete sentence about this design.
- Never describe a reference solution and never reveal what a hidden drill does.

Answer only by calling submit_design_review.`;

export interface DesignReviewRequest {
  content: ProblemContent;
  design: string;
  checks: ItemScore[];
  drills: DrillScore[];
  userId: string;
}

export interface WrittenDesignReview {
  review: DesignReview;
  reviewScore: number;
  model: string;
  promptVersion: number;
  tokens: number;
}

const record = ({ content, design, checks, drills }: DesignReviewRequest) =>
  [
    `# Problem: ${content.title}`,
    content.statement,
    "",
    "# The submitted design",
    design,
    "",
    "# Drills",
    ...drills.map(
      (drill) =>
        `- ${drill.title}: ${drill.passed ? "passed" : "failed"}${drill.failures.length > 0 ? `. ${drill.failures.join(". ")}` : ""}`,
    ),
    "",
    "# Automated checks",
    ...checks.map(
      (check) =>
        `- ${check.title}: ${check.passed ? "passed" : "failed"}. ${check.evidence}`,
    ),
  ].join("\n");

const complete = (review: z.infer<typeof DesignReviewSchema>) =>
  new Set(review.items.map((item) => item.dimension)).size ===
  DESIGN_DIMENSIONS.length;

export class DesignReviewer extends Service {
  public async write(
    request: DesignReviewRequest,
  ): Promise<WrittenDesignReview> {
    const conversation = new ToolConversation(
      {
        system: DESIGN_REVIEWER_PERSONA,
        tool: SUBMIT_DESIGN_REVIEW,
        userId: request.userId,
      },
      record(request),
    );
    const first = await conversation.ask();
    let review = DesignReviewSchema.safeParse(first.input).data;

    if (!review || !complete(review)) {
      conversation.reject(
        first,
        "The review could not be accepted. Call submit_design_review again with one item for each of design, scaling and reliability.",
      );
      review = DesignReviewSchema.safeParse(
        (await conversation.ask()).input,
      ).data;
    }

    if (!review || !complete(review)) {
      throw new ReviewModelError("The review model gave no design review");
    }

    const items = DESIGN_DIMENSIONS.map((dimension) =>
      review.items.find((item) => item.dimension === dimension)!,
    );

    return {
      review: { ...review, items },
      reviewScore: Math.round(
        (100 * items.reduce((sum, item) => sum + item.score, 0)) /
          (3 * items.length),
      ),
      model: getEnv().LLM_REVIEW_MODEL,
      promptVersion: REVIEW_PROMPT_VERSION,
      tokens: conversation.tokens,
    };
  }
}
