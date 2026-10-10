import type { ProblemContent } from "@repo/design";
import { OFFICIAL_PROBLEMS } from "@repo/design/library";
import { createGuest, createUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import {
  hashProblem,
  ProblemsRepository,
  ProblemsService,
} from "@/modules/problems";

import type { DesignBody, ErrorBody } from "../designs/helpers";
import { buildReference, start } from "./helpers";

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;
const PATH = "/api/problems/url-shortener";

interface Attempt {
  designId: string;
  problemVersion: number;
  latestVersion: number;
  hints: Array<{ index: number; cost: number }>;
  hintPenalty: number;
}

interface Problem {
  version: number;
  statement: string;
}

interface Submission {
  problemVersion: number;
  score: number;
}

const publish = (content: ProblemContent) =>
  make(ProblemsRepository).syncOfficial({
    content,
    contentHash: hashProblem(content),
  });

const edited: ProblemContent = {
  ...shortener,
  statement: `${shortener.statement}\n\nLinks now expire after a year.`,
  hints: [{ ...shortener.hints[0]!, cost: shortener.hints[0]!.cost + 1 }],
};

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("problem versions", () => {
  test("an attempt says when its problem has a newer version", async () => {
    const user = await createUser();
    const started = (await user.post<Attempt>(`${PATH}/start`)).body;

    await publish(edited);

    const attempt = await user.get<Attempt>(`${PATH}/attempt`);

    expect(started).toMatchObject({ problemVersion: 1, latestVersion: 1 });
    expect(attempt.body).toMatchObject({ problemVersion: 1, latestVersion: 2 });
  });

  test("a problem answers the version an attempt is pinned to, and 404 for one that does not exist", async () => {
    const user = await createUser();

    await publish(edited);

    const current = await user.get<Problem>(PATH);
    const pinned = await user.get<Problem>(`${PATH}?version=1`);
    const missing = await user.get<ErrorBody>(`${PATH}?version=9`);

    expect(current.body).toMatchObject({
      version: 2,
      statement: edited.statement,
    });
    expect(pinned.body).toMatchObject({
      version: 1,
      statement: shortener.statement,
    });
    expect(missing.status).toBe(404);
  });

  test("moving to the latest version keeps the design and scores what comes next by the new version", async () => {
    const user = await createUser();
    const attempt = await start(user);
    const revision = await buildReference(user, attempt);
    const before = await user.post<Submission>(`${PATH}/submissions`, {});

    await publish(edited);

    const moved = await user.post<Attempt>(`${PATH}/attempt/upgrade`);
    const design = await user.get<DesignBody>(
      `/api/designs/${attempt.designId}`,
    );
    const after = await user.post<Submission>(`${PATH}/submissions`, {});
    const history = await user.get<{ items: Submission[] }>(
      `${PATH}/submissions`,
    );

    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({
      designId: attempt.designId,
      problemVersion: 2,
      latestVersion: 2,
    });
    expect(design.body.revision).toBe(revision);
    expect(before.body).toMatchObject({ problemVersion: 1, score: 100 });
    expect(after.body).toMatchObject({ problemVersion: 2, score: 100 });
    expect(history.body.items.map((item) => item.problemVersion)).toEqual([
      2, 1,
    ]);
  });

  test("hints carry over, no more than the new version has, and cost what it says", async () => {
    const user = await createUser();

    await start(user);
    await user.post(`${PATH}/hints/0`);
    await user.post(`${PATH}/hints/1`);
    await publish(edited);

    const moved = await user.post<Attempt>(`${PATH}/attempt/upgrade`);

    expect(moved.body.hints.map((hint) => hint.index)).toEqual([0]);
    expect(moved.body.hintPenalty).toBe(edited.hints[0]!.cost);
  });

  test("moving an attempt already on the latest version changes nothing", async () => {
    const user = await createUser();
    const attempt = await start(user);

    await user.post(`${PATH}/hints/0`);

    const moved = await user.post<Attempt>(`${PATH}/attempt/upgrade`);

    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({
      designId: attempt.designId,
      problemVersion: 1,
      latestVersion: 1,
      hintPenalty: shortener.hints[0]!.cost,
    });
  });

  test("moving answers 404 before the problem is started, and 401 to a guest", async () => {
    const user = await createUser();
    const early = await user.post<ErrorBody>(`${PATH}/attempt/upgrade`);

    expect(early.status).toBe(404);
    expect(early.body.code).toBe("PROBLEM_NOT_STARTED");
    expect((await createGuest().post(`${PATH}/attempt/upgrade`)).status).toBe(
      401,
    );
  });
});
