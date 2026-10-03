import { createUser, inbox, type TestClient } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make, makeRepository } from "@/core/registry";
import { getDatabase, reviewsSchema } from "@/db";
import { TurnScheduler } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";
import { GenerateReviewJob, ReviewsRepository } from "@/modules/reviews";

import {
  type InterviewBody,
  PATH,
  startInterview,
} from "../interviews/helpers";
import {
  buildReference,
  itemsScoring,
  model,
  reviewAnswer,
  reviewRequests,
  RUBRIC_KEYS,
} from "./helpers";

interface ReviewBody {
  id: string;
  score: number | null;
  designScore: number;
  summary: string;
  items: Array<{
    key: string;
    score: number | null;
    rationale: string;
    citations: Array<{ label: string; kind: string; text: string }>;
  }>;
  drills: Array<{ id: string; title: string; passed: boolean }>;
  checks: Array<{ key: string; passed: boolean }>;
}

const scheduler = () => make(TurnScheduler);

const status = async (user: TestClient, id: string) =>
  (await user.get<InterviewBody>(`${PATH}/${id}`)).body.status;

const review = (user: TestClient, id: string) =>
  user.get<ReviewBody>(`${PATH}/${id}/review`);

const interviewWithAQuestion = async () => {
  const user = await createUser();
  const interview = await startInterview(user);

  await user.post(`${PATH}/${interview.id}/messages`, {
    body: "How many redirects a second should it take?",
  });
  await scheduler().drain();

  return { user, interview };
};

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("the review", () => {
  test("is written when the interview ends, cites the record and scores the final design", async () => {
    const { user, interview } = await interviewWithAQuestion();

    await buildReference(user, interview.id);
    model().enqueue(reviewAnswer());

    const submitted = await user.post<{ status: string }>(
      `${PATH}/${interview.id}/submit`,
      {},
    );
    const written = await review(user, interview.id);
    const request = reviewRequests()[0]!;
    const record = request.messages[0]!.content.map((part) =>
      part.type === "text" ? part.text : "",
    ).join("");

    expect(submitted.body.status).toBe("reviewing");
    expect(await status(user, interview.id)).toBe("reviewed");
    expect(written.status).toBe(200);
    expect(written.body).toMatchObject({
      score: 67,
      designScore: 100,
      summary: "A solid interview with a clear read path.",
    });
    expect(written.body.items.map((item) => item.key)).toEqual(RUBRIC_KEYS);
    expect(written.body.items[0]!.citations).toEqual([
      {
        label: "M2",
        kind: "message",
        text: "Candidate: How many redirects a second should it take?",
      },
    ]);
    expect(written.body.drills.every((drill) => drill.passed)).toBe(true);
    expect(record).toContain("M2. Candidate: How many redirects");
    expect(record).toContain("The database primary fails: passed");
    expect(inbox.lastFor(user.email).subject).toBe(
      "Your interview review is ready",
    );
  });

  test("is written once, however often the interview is submitted or the job runs", async () => {
    const { user, interview } = await interviewWithAQuestion();

    model().enqueue(reviewAnswer());
    await user.post(`${PATH}/${interview.id}/submit`, {});
    await user.post(`${PATH}/${interview.id}/submit`, {});
    await make(GenerateReviewJob).handle({ interviewId: interview.id });

    const rows = await getDatabase().select().from(reviewsSchema);

    expect(rows).toHaveLength(1);
    expect(reviewRequests()).toHaveLength(1);
  });

  test("scores the design as it ended, even after a fix was reverted", async () => {
    const { user, interview } = await interviewWithAQuestion();

    await buildReference(user, interview.id);
    await user.post(`${PATH}/${interview.id}/ops`, {
      baseRevision: 1,
      ops: [
        { op: "remove-node", id: "replica-a" },
        { op: "remove-node", id: "replica-b" },
      ],
    });
    model().enqueue(reviewAnswer());
    await user.post(`${PATH}/${interview.id}/submit`, {});

    const written = await review(user, interview.id);

    expect(written.body.designScore).toBeLessThan(100);
    expect(
      written.body.drills.find((drill) => drill.id === "primary-fails"),
    ).toMatchObject({ passed: false });
  });

  test("asks once more about items it cannot accept, and leaves the rest unscored", async () => {
    const { user, interview } = await interviewWithAQuestion();
    const [first, second, ...rest] = RUBRIC_KEYS;

    model().enqueue(
      reviewAnswer([
        { key: first!, score: 3, rationale: "Great.", citations: ["M99"] },
        { key: second!, score: 2, rationale: "Fine.", citations: [] },
        ...itemsScoring(1, ["M2"], rest),
      ]),
      reviewAnswer(
        [
          { key: first!, score: 3, rationale: "Great.", citations: ["M2"] },
          { key: second!, score: 2, rationale: "Fine.", citations: [] },
        ],
        "review-2",
      ),
    );
    await user.post(`${PATH}/${interview.id}/submit`, {});

    const written = await review(user, interview.id);
    const retry = reviewRequests()[1]!.messages.at(-1)!.content[0]!;

    expect(reviewRequests()).toHaveLength(2);
    expect(retry).toMatchObject({ type: "tool-result", isError: true });
    expect(retry.type === "tool-result" && retry.content).toContain(
      `${first}: it cites M99, which do not exist`,
    );
    expect(written.body.items[0]).toMatchObject({ key: first, score: 3 });
    expect(written.body.items[1]).toMatchObject({ key: second, score: null });
    expect(written.body.items[1]!.rationale).toContain("Not scored");
    expect(written.body.items.slice(2).every((item) => item.score === 1)).toBe(
      true,
    );
  });

  test("fails without an answer, and a retry writes it", async () => {
    const { user, interview } = await interviewWithAQuestion();

    await user.post(`${PATH}/${interview.id}/submit`, {});

    const missing = await review(user, interview.id);
    const failed = await status(user, interview.id);

    model().enqueue(reviewAnswer());

    const retried = await user.post<{ status: string }>(
      `${PATH}/${interview.id}/review/retry`,
      {},
    );
    const again = await user.post<{ code: string }>(
      `${PATH}/${interview.id}/review/retry`,
      {},
    );

    expect(failed).toBe("review_failed");
    expect(missing.status).toBe(404);
    expect(retried.status).toBe(202);
    expect(await status(user, interview.id)).toBe("reviewed");
    expect((await review(user, interview.id)).status).toBe(200);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("REVIEW_NOT_FAILED");
  });

  test("of an interview the interviewer ends reads its goodbye", async () => {
    const user = await createUser();
    const interview = await startInterview(user);

    model().enqueue(
      [
        { type: "text-delta", text: "Thanks, that's all from me." },
        {
          type: "tool-use",
          id: "e1",
          name: "end_interview",
          input: { reason: "wrapped up" },
        },
        { type: "stop", reason: "tool-use" },
      ],
      reviewAnswer(itemsScoring(0, [])),
    );
    await user.post(`${PATH}/${interview.id}/messages`, {
      body: "I think we're done.",
    });
    await scheduler().drain();

    const record = reviewRequests()[0]!
      .messages[0]!.content.map((part) =>
        part.type === "text" ? part.text : "",
      )
      .join("");

    expect(await status(user, interview.id)).toBe("reviewed");
    expect(record).toContain("M3. Interviewer: Thanks, that's all from me.");
    expect((await review(user, interview.id)).body.score).toBe(0);
  });

  test("belongs to the candidate alone", async () => {
    const { user, interview } = await interviewWithAQuestion();
    const other = await createUser();

    model().enqueue(reviewAnswer());
    await user.post(`${PATH}/${interview.id}/submit`, {});

    expect((await review(other, interview.id)).status).toBe(404);
    expect(
      (await other.post(`${PATH}/${interview.id}/review/retry`, {})).status,
    ).toBe(404);
    expect(
      await makeRepository(ReviewsRepository).findByInterview(interview.id),
    ).not.toBeNull();
  });
});
