import { getEnv } from "@/configs";
import { Service } from "@/core/service";
import type { PinnedProblem } from "@/modules/interviews";

import type { ReviewItem } from "../review.entity";
import { REVIEW_PROMPT_VERSION } from "../reviews.constants";
import { ReviewModelError } from "../reviews.errors";
import {
  type DraftItem,
  problemWith,
  type ReviewDraft,
  ReviewDraftSchema,
  toReviewItem,
} from "./draft";
import type { Evidence } from "./evidence";
import { reviewerPersona, reviewRecord } from "./prompt";
import { reviewTool, ToolConversation } from "./tool-conversation";

const SUBMIT_REVIEW = reviewTool(
  "submit_review",
  "Submit the review: a summary, strengths, improvements and a score for every rubric item.",
  ReviewDraftSchema,
);

export interface ReviewRequest {
  pinned: PinnedProblem;
  evidence: Evidence;
  design: string;
  userId: string;
}

export interface WrittenReview {
  summary: string;
  strengths: string[];
  improvements: string[];
  items: ReviewItem[];
  model: string;
  promptVersion: number;
  tokens: number;
}

export class Reviewer extends Service {
  public async write({
    pinned,
    evidence,
    design,
    userId,
  }: ReviewRequest): Promise<WrittenReview> {
    const rubric = pinned.interview.rubric;
    const conversation = new ToolConversation(
      {
        system: reviewerPersona(pinned.content.track),
        tool: SUBMIT_REVIEW,
        userId,
      },
      reviewRecord(pinned, evidence, design),
    );
    const first = await conversation.ask();
    let draft = ReviewDraftSchema.safeParse(first.input).data;

    if (!draft) {
      conversation.reject(
        first,
        "The review could not be read. Call submit_review with the whole review, matching its schema.",
      );
      draft = ReviewDraftSchema.safeParse(
        (await conversation.ask()).input,
      ).data;
    } else {
      const invalid = this.invalidItems(draft, rubric, evidence);

      if (invalid.length > 0) {
        conversation.reject(
          first,
          [
            "Some items cannot be accepted:",
            ...invalid.map(({ key, problem }) => `- ${key}: ${problem}.`),
            "Call submit_review again with the whole review, correcting these items.",
          ].join("\n"),
        );

        const second = ReviewDraftSchema.safeParse(
          (await conversation.ask()).input,
        ).data;

        if (second) {
          draft = this.mend(
            draft,
            second,
            invalid.map((item) => item.key),
          );
        }
      }
    }

    if (!draft) throw new ReviewModelError("The review model gave no review");

    const byKey = new Map(draft.items.map((item) => [item.key, item]));

    return {
      summary: draft.summary,
      strengths: draft.strengths,
      improvements: draft.improvements,
      items: rubric.map((item) =>
        toReviewItem(item, byKey.get(item.key), evidence),
      ),
      model: getEnv().LLM_REVIEW_MODEL,
      promptVersion: REVIEW_PROMPT_VERSION,
      tokens: conversation.tokens,
    };
  }

  private invalidItems(
    draft: ReviewDraft,
    rubric: PinnedProblem["interview"]["rubric"],
    evidence: Evidence,
  ): Array<{ key: string; problem: string }> {
    const byKey = new Map(draft.items.map((item) => [item.key, item]));

    return rubric.flatMap((item) => {
      const problem = problemWith(byKey.get(item.key), evidence);

      return problem ? [{ key: item.key, problem }] : [];
    });
  }

  private mend(
    draft: ReviewDraft,
    second: ReviewDraft,
    keys: string[],
  ): ReviewDraft {
    const fixed = new Map<string, DraftItem>(
      second.items
        .filter((item) => keys.includes(item.key))
        .map((item) => [item.key, item]),
    );

    return {
      ...draft,
      items: [
        ...draft.items.filter((item) => !fixed.has(item.key)),
        ...fixed.values(),
      ],
    };
  }
}
