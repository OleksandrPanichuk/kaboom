import { createVerifiedUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import { ProblemsService } from "@/modules/problems";

import { createModerator, publishFork } from "../authoring/helpers";
import { start } from "../submissions/helpers";

const PATH = "/api/problems/url-shortener/rating";

interface Rating {
  average: number | null;
  count: number;
  distribution: number[];
  mine: number | null;
  eligibility: "eligible" | "own-problem" | "needs-submission";
}

interface ErrorBody {
  code?: string;
}

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

const submitBaseline = async (user: TestUser, slug = "url-shortener") => {
  await start(user, slug);
  await user.post(`/api/problems/${slug}/submissions`, {});
};

const rate = (user: TestUser, stars: number, path = PATH) =>
  user.put<Rating & ErrorBody>(path, { stars });

describe("problem ratings", () => {
  test("a solver rates once they have submitted", async () => {
    const ada = await createVerifiedUser();

    expect((await ada.get<Rating>(PATH)).body).toEqual({
      average: null,
      count: 0,
      distribution: [0, 0, 0, 0, 0],
      mine: null,
      eligibility: "needs-submission",
    });

    const early = await rate(ada, 5);

    expect(early.status).toBe(403);
    expect(early.body.code).toBe("RATING_NEEDS_SUBMISSION");

    await submitBaseline(ada);

    expect((await rate(ada, 4)).body).toEqual({
      average: 4,
      count: 1,
      distribution: [0, 0, 0, 1, 0],
      mine: 4,
      eligibility: "eligible",
    });
  });

  test("rating again replaces it, and it can be taken back", async () => {
    const ada = await createVerifiedUser();
    const grace = await createVerifiedUser();

    await submitBaseline(ada);
    await submitBaseline(grace);
    await rate(ada, 5);
    await rate(grace, 2);

    expect((await rate(grace, 3)).body).toMatchObject({
      average: 4,
      count: 2,
      distribution: [0, 0, 1, 0, 1],
      mine: 3,
    });

    const cleared = await grace.delete<Rating>(PATH);

    expect(cleared.body).toMatchObject({ average: 5, count: 1, mine: null });
  });

  test("refuses stars outside one to five", async () => {
    const ada = await createVerifiedUser();

    await submitBaseline(ada);

    expect((await rate(ada, 0)).status).toBe(422);
    expect((await rate(ada, 6)).status).toBe(422);
  });

  test("an author never rates their own problem", async () => {
    const author = await createVerifiedUser();
    const moderator = await createModerator();
    const slug = await publishFork(author, moderator, "Shortener, again");
    const path = `/api/problems/${slug}/rating`;

    expect((await author.get<Rating>(path)).body.eligibility).toBe(
      "own-problem",
    );

    const refused = await rate(author, 5, path);

    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe("RATING_OWN_PROBLEM");
  });

  test("the catalogue shows each problem's average and count", async () => {
    const ada = await createVerifiedUser();
    const grace = await createVerifiedUser();

    await submitBaseline(ada);
    await submitBaseline(grace);
    await rate(ada, 5);
    await rate(grace, 4);

    const listed = await ada.get<{
      items: Array<{
        slug: string;
        rating: { average: number; count: number };
      }>;
    }>("/api/problems?limit=100");
    const shortener = listed.body.items.find(
      (problem) => problem.slug === "url-shortener",
    );

    expect(shortener?.rating).toEqual({ average: 4.5, count: 2 });
  });
});
