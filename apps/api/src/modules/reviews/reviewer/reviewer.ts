import z from "zod";

import { getEnv } from "@/configs";
import { make } from "@/core/registry";
import { Service } from "@/core/service";
import type { PinnedProblem } from "@/modules/interviews";
import {
  LanguageModel,
  type LlmMessage,
  type LlmTool,
  tokensOf,
  UsageLedger,
} from "@/platform/llm";

import type { ReviewItem } from "../review.entity";
import {
  REVIEW_MAX_OUTPUT_TOKENS,
  REVIEW_PROMPT_VERSION,
} from "../reviews.constants";
import { ReviewModelError } from "../reviews.errors";
import {
  type DraftItem,
  problemWith,
  type ReviewDraft,
  ReviewDraftSchema,
  toReviewItem,
} from "./draft";
import type { Evidence } from "./evidence";
import { REVIEWER_PERSONA, reviewRecord } from "./prompt";

const SUBMIT_REVIEW: LlmTool = {
  name: "submit_review",
  description:
    "Submit the review: a summary, strengths, improvements and a score for every rubric item.",
  inputSchema: z.toJSONSchema(ReviewDraftSchema),
};

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

interface Answer {
  toolUseId: string | null;
  input: unknown;
}

export class Reviewer extends Service {
  public async write({
    pinned,
    evidence,
    design,
    userId,
  }: ReviewRequest): Promise<WrittenReview> {
    const rubric = pinned.interview.rubric;
    const conversation: LlmMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: reviewRecord(pinned, evidence, design) },
        ],
      },
    ];
    let tokens = 0;

    const ask = async (): Promise<Answer> => {
      let answer: Answer = { toolUseId: null, input: null };

      for await (const event of make(LanguageModel).stream({
        role: "review",
        system: [{ text: REVIEWER_PERSONA, cache: true }],
        messages: conversation,
        tools: [SUBMIT_REVIEW],
        maxOutputTokens: REVIEW_MAX_OUTPUT_TOKENS,
        userId,
        signal: new AbortController().signal,
      })) {
        if (event.type === "tool-use" && event.name === SUBMIT_REVIEW.name) {
          answer = { toolUseId: event.id, input: event.input };
        } else if (event.type === "usage") {
          tokens += tokensOf(event.usage);
          await make(UsageLedger).record(userId, event.usage);
        }
      }

      return answer;
    };

    const retry = (answer: Answer, problem: string) => {
      conversation.push(
        answer.toolUseId
          ? {
              role: "assistant",
              content: [
                {
                  type: "tool-use",
                  id: answer.toolUseId,
                  name: SUBMIT_REVIEW.name,
                  input: answer.input,
                },
              ],
            }
          : {
              role: "assistant",
              content: [{ type: "text", text: "(no review)" }],
            },
        {
          role: "user",
          content: [
            answer.toolUseId
              ? {
                  type: "tool-result",
                  toolUseId: answer.toolUseId,
                  content: problem,
                  isError: true,
                }
              : { type: "text", text: problem },
          ],
        },
      );
    };

    const first = await ask();
    let draft = ReviewDraftSchema.safeParse(first.input).data;

    if (!draft) {
      retry(
        first,
        "The review could not be read. Call submit_review with the whole review, matching its schema.",
      );
      draft = ReviewDraftSchema.safeParse((await ask()).input).data;
    } else {
      const invalid = this.invalidItems(draft, rubric, evidence);

      if (invalid.length > 0) {
        retry(
          first,
          [
            "Some items cannot be accepted:",
            ...invalid.map(({ key, problem }) => `- ${key}: ${problem}.`),
            "Call submit_review again with the whole review, correcting these items.",
          ].join("\n"),
        );

        const second = ReviewDraftSchema.safeParse((await ask()).input).data;

        if (second)
          draft = this.mend(
            draft,
            second,
            invalid.map((item) => item.key),
          );
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
      tokens,
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
