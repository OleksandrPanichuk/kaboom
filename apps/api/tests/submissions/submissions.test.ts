import { type DesignOp, OFFICIAL_PROBLEMS } from "@repo/design";
import { createGuest, createUser, type TestClient } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import {
  hashProblem,
  ProblemsRepository,
  ProblemsService,
} from "@/modules/problems";

import { applyOps, type DesignBody, type ErrorBody } from "../designs/helpers";

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;
const PATH = "/api/problems/url-shortener";

interface Attempt {
  designId: string;
  problemVersion: number;
}

interface DrillResult {
  id: string;
  visibility: string;
  passed: boolean;
  failures: string[];
}

interface Submission {
  id: string;
  score: number;
  revision: number;
  problemVersion: number;
  items: Array<{ key: string; passed: boolean; evidence: string }>;
  drills: DrillResult[];
}

interface Progress {
  points: number;
  rank: {
    name: string;
    points: number;
    floorPoints: number;
    nextName: string | null;
    nextPoints: number | null;
  };
  problems: Array<{
    slug: string;
    bestScore: number;
    points: number;
    submissions: number;
  }>;
}

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

const start = async (user: TestClient) =>
  (await user.post<Attempt>(`${PATH}/start`)).body;

const buildReference = async (user: TestClient, attempt: Attempt) => {
  const design = await user.get<DesignBody>(`/api/designs/${attempt.designId}`);
  const present = new Set(design.body.graph.nodes.map((node) => node.id));
  const ops: DesignOp[] = [
    ...shortener.reference.graph.nodes
      .filter((node) => !present.has(node.id))
      .map((node): DesignOp => ({ op: "add-node", node })),
    ...shortener.reference.graph.edges.map((edge): DesignOp => ({
      op: "add-edge",
      edge,
    })),
  ];
  const applied = await applyOps(
    user,
    attempt.designId,
    design.body.revision,
    ops,
  );

  expect(applied.status).toBe(200);

  return applied.body.revision;
};

describe("problem attempts", () => {
  test("start a design from the baseline and pin the problem's version", async () => {
    const user = await createUser();

    const first = await start(user);
    const again = await start(user);
    const design = await user.get<DesignBody>(`/api/designs/${first.designId}`);

    expect(again).toEqual(first);
    expect(first.problemVersion).toBe(1);
    expect(design.body).toMatchObject({ name: "URL shortener", revision: 0 });
    expect(design.body.graph.nodes.map((node) => node.id)).toEqual(["users"]);
  });

  test("answer 404 PROBLEM_NOT_STARTED before the problem is started", async () => {
    const user = await createUser();

    const attempt = await user.get<ErrorBody>(`${PATH}/attempt`);
    const run = await user.post<ErrorBody>(`${PATH}/runs`);

    expect(attempt.status).toBe(404);
    expect(attempt.body.code).toBe("PROBLEM_NOT_STARTED");
    expect(run.status).toBe(404);
  });

  test("keep one solver's attempt away from another", async () => {
    const one = await createUser();
    const other = await createUser();
    const attempt = await start(one);

    expect((await other.get(`${PATH}/attempt`)).status).toBe(404);
    expect((await other.get(`/api/designs/${attempt.designId}`)).status).toBe(
      404,
    );
    expect((await createGuest().post(`${PATH}/start`)).status).toBe(401);
  });
});

describe("running and submitting", () => {
  test("a run shows the public drills only, with their failures", async () => {
    const user = await createUser();

    await start(user);

    const run = await user.post<{ revision: number; drills: DrillResult[] }>(
      `${PATH}/runs`,
    );

    expect(run.status).toBe(200);
    expect(run.body.drills.map((drill) => [drill.id, drill.passed])).toEqual([
      ["normal-day", false],
      ["viral-link", false],
    ]);
    expect(run.body.drills[0]!.failures[0]).toContain("Users");
  });

  test("the reference solution scores 100, and hidden drills say nothing but their outcome", async () => {
    const user = await createUser();
    const attempt = await start(user);
    const revision = await buildReference(user, attempt);

    const submitted = await user.post<Submission>(`${PATH}/submissions`, {
      revision,
    });
    const raw = JSON.stringify(submitted.body);

    expect(submitted.status).toBe(200);
    expect(submitted.body).toMatchObject({
      score: 100,
      revision,
      problemVersion: 1,
    });
    expect(submitted.body.items.every((item) => item.passed)).toBe(true);
    expect(
      submitted.body.items.find(
        (item) => item.key === "recovers-from-primary-failure",
      )?.evidence,
    ).toBe("Passed a hidden drill.");
    expect(
      submitted.body.drills
        .filter((drill) => drill.visibility === "hidden")
        .every((drill) => drill.failures.length === 0),
    ).toBe(true);
    expect(raw).not.toContain("node-down");
  });

  test("the baseline scores 0, and a stale revision is refused", async () => {
    const user = await createUser();

    await start(user);

    const baseline = await user.post<Submission>(`${PATH}/submissions`, {});
    const stale = await user.post<ErrorBody>(`${PATH}/submissions`, {
      revision: 7,
    });

    expect(baseline.body.score).toBe(0);
    expect(
      baseline.body.items.find(
        (item) => item.key === "recovers-from-primary-failure",
      )?.evidence,
    ).toBe("A hidden drill found a problem.");
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("SUBMISSION_REVISION_MISMATCH");
  });

  test("lists submissions newest first, and progress counts the best one", async () => {
    const user = await createUser();
    const attempt = await start(user);
    const empty = await user.post<Submission>(`${PATH}/submissions`, {});

    await buildReference(user, attempt);

    const full = await user.post<Submission>(`${PATH}/submissions`, {});
    const list = await user.get<{ items: Submission[] }>(`${PATH}/submissions`);
    const progress = await user.get<Progress>("/api/progress");

    expect(list.body.items.map((item) => item.id)).toEqual([
      full.body.id,
      empty.body.id,
    ]);
    expect(progress.body).toMatchObject({
      points: 100,
      rank: { name: "Middle", nextName: "Senior" },
      problems: [
        { slug: "url-shortener", bestScore: 100, points: 100, submissions: 2 },
      ],
    });
  });

  test("a new version of the problem leaves an attempt on the version it started", async () => {
    const user = await createUser();

    await start(user);

    const edited = { ...shortener, summary: "A new summary, a new version." };

    await make(ProblemsRepository).syncOfficial({
      content: edited,
      contentHash: hashProblem(edited),
    });

    const submitted = await user.post<Submission>(`${PATH}/submissions`, {});
    const newcomer = await createUser();

    expect(submitted.body.problemVersion).toBe(1);
    expect((await start(newcomer)).problemVersion).toBe(2);
  });

  test("progress is empty before anything is submitted", async () => {
    const user = await createUser();

    expect((await user.get<Progress>("/api/progress")).body).toEqual({
      points: 0,
      rank: {
        name: "Junior",
        points: 0,
        floorPoints: 0,
        nextName: "Middle",
        nextPoints: 100,
      },
      problems: [],
    });
  });
});
