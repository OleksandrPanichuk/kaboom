import { describe, expect, test } from "bun:test";

import { createNode, emptyGraph } from "../graph";
import { OFFICIAL_PROBLEMS } from "./library";
import { edge, graph, node } from "./library/build";
import {
  checkPublishable,
  HIDDEN_FAILED,
  publicProblem,
  publicScore,
} from "./publish";
import { drillScenario, selectNodes } from "./resolve";
import { ProblemContentSchema } from "./schema";
import { runPublicDrills, scoreSubmission } from "./score";

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;

const users = () =>
  node("users", "client", "Users", { rps: 10_000, readRatio: 0.95 });

describe("official problems", () => {
  test.each(OFFICIAL_PROBLEMS.map((problem) => [problem.slug, problem]))(
    "%s is publishable: its reference solution scores 100",
    (_, problem) => {
      expect(checkPublishable(problem)).toMatchObject({ ok: true });
      expect(scoreSubmission(problem, problem.reference.graph).score).toBe(100);
    },
  );

  test.each(OFFICIAL_PROBLEMS.map((problem) => [problem.slug, problem]))(
    "%s gives its untouched baseline nothing",
    (_, problem) => {
      expect(scoreSubmission(problem, problem.baseline).score).toBe(0);
    },
  );
});

describe("scoring the URL shortener", () => {
  test("gives a straight design without a cache or replicas only what it earns", () => {
    const plain = graph(
      [
        users(),
        node("lb", "load-balancer", "LB"),
        node("api", "service", "API", {
          replicas: 20,
          capacityRpsPerReplica: 2_500,
        }),
        node("db", "sql-database", "Links", {
          readCapacityRps: 20_000,
          writeCapacityRps: 4_000,
        }),
      ],
      [
        edge("users", "lb", "sync-call"),
        edge("lb", "api", "sync-call"),
        edge("api", "db", "read"),
        edge("api", "db", "write"),
      ],
    );
    const score = scoreSubmission(shortener, plain);
    const passed = Object.fromEntries(
      score.items.map((item) => [item.key, item.passed]),
    );

    expect(passed).toEqual({
      "handles-a-normal-day": true,
      "survives-a-viral-link": false,
      "recovers-from-primary-failure": false,
      "survives-a-cache-flush": true,
      "no-single-point-of-failure": false,
      "caches-redirects": false,
    });
    expect(score.score).toBe(40);
  });

  test("explains each missed item in the design's own terms", () => {
    const score = scoreSubmission(shortener, shortener.baseline);
    const normal = score.items.find(
      (item) => item.key === "handles-a-normal-day",
    );

    expect(normal?.evidence).toContain("Users");
  });

  test("runs only the public drills for a Run", () => {
    const drills = runPublicDrills(shortener, shortener.reference.graph);

    expect(drills.map((drill) => drill.id)).toEqual([
      "normal-day",
      "viral-link",
    ]);
    expect(drills.every((drill) => drill.passed)).toBe(true);
  });
});

describe("scoring the photo upload pipeline", () => {
  const uploads = OFFICIAL_PROBLEMS.find(
    (problem) => problem.slug === "photo-uploads",
  )!;

  test("gives thumbnails made inside the upload request almost nothing", () => {
    const synchronous = graph(
      [
        node("users", "client", "Users", { rps: 5_500, readRatio: 0.9 }),
        node("cdn", "cdn", "CDN", { hitRatio: 0.9, capacityRps: 100_000 }),
        node("lb", "load-balancer", "LB"),
        node("api", "service", "API", {
          replicas: 6,
          capacityRpsPerReplica: 500,
        }),
        node("store", "object-storage", "Store", {
          readCapacityRps: 10_000,
          writeCapacityRps: 10_000,
        }),
        node("workers", "worker", "Workers", {
          replicas: 150,
          capacityMsgPerReplica: 5,
          processingMs: 200,
        }),
      ],
      [
        edge("users", "cdn", "read"),
        edge("cdn", "store", "read"),
        edge("users", "lb", "write"),
        edge("lb", "api", "sync-call"),
        edge("api", "store", "write"),
        edge("api", "workers", "sync-call"),
        edge("workers", "store", "write"),
      ],
    );
    const score = scoreSubmission(uploads, synchronous);

    expect(score.score).toBe(10);
    expect(
      score.items.find((item) => item.key === "handles-a-normal-day")?.evidence,
    ).toContain("p99");
  });

  test("lets the reference fall behind while the workers are down, then catch up", () => {
    const drill = uploads.drills.find((item) => item.id === "workers-down")!;
    const outcome = scoreSubmission(
      uploads,
      uploads.reference.graph,
    ).drills.find((item) => item.id === drill.id);

    expect(outcome?.passed).toBe(true);
  });
});

describe("drill selectors", () => {
  const replicated = graph(
    [
      node("primary", "sql-database", "Primary"),
      node("replica", "sql-database", "Replica"),
      node("other", "sql-database", "Other"),
      node("cache", "cache", "Cache"),
    ],
    [edge("primary", "replica", "replication")],
  );

  test("picks every node of a kind, or only the primaries", () => {
    const ids = (role: "any" | "primary") =>
      selectNodes(replicated, { nodeKind: "sql-database", role }).map(
        (item) => item.id,
      );

    expect(ids("any")).toEqual(["primary", "replica", "other"]);
    expect(ids("primary")).toEqual(["primary", "other"]);
  });

  test("turns a drill's selector into one fault per matching node", () => {
    const [drill] = ProblemContentSchema.parse({
      ...shortener,
      drills: [
        {
          id: "down",
          title: "Down",
          visibility: "public",
          faults: [
            {
              kind: "node-down",
              select: { nodeKind: "sql-database", role: "primary" },
              at: 30,
            },
          ],
          expect: {},
        },
      ],
    }).drills;

    expect(drillScenario(drill!, replicated).faults).toEqual([
      { kind: "node-down", nodeId: "primary", at: 30 },
      { kind: "node-down", nodeId: "other", at: 30 },
    ]);
  });
});

describe("publishing", () => {
  test("hides what solvers must not see", () => {
    const shown = publicProblem(shortener);
    const serialised = JSON.stringify(shown);

    expect(
      shown.drills.filter((drill) => drill.visibility === "hidden"),
    ).toEqual([
      {
        id: "primary-fails",
        title: "The database primary fails",
        description: "",
        visibility: "hidden",
      },
      {
        id: "cache-flush",
        title: "The cache is flushed",
        description: "",
        visibility: "hidden",
      },
    ]);
    expect(serialised).not.toContain("reference");
    expect(serialised).not.toContain("node-down");
    expect(serialised).not.toContain("endAvailability");
  });

  test("masks what a score says about hidden drills", () => {
    const shown = publicScore(
      shortener,
      scoreSubmission(shortener, shortener.baseline),
    );
    const serialised = JSON.stringify(shown);

    expect(shown.score).toBe(0);
    expect(
      shown.items.find((item) => item.key === "recovers-from-primary-failure")
        ?.evidence,
    ).toBe(HIDDEN_FAILED);
    expect(
      shown.items.find((item) => item.key === "handles-a-normal-day")?.evidence,
    ).toContain("Users");
    expect(
      shown.drills
        .filter((drill) => drill.visibility === "hidden")
        .every((drill) => drill.failures.length === 0),
    ).toBe(true);
    expect(serialised).not.toContain("by then");
  });

  test("refuses a problem whose reference does not solve it", () => {
    const broken = checkPublishable({
      ...shortener,
      reference: { graph: shortener.baseline, notes: "" },
    });

    expect(broken.ok).toBe(false);
    expect(!broken.ok && broken.issues[0]).toContain("scores 0, not 100");
  });

  test("refuses a rubric item that names a missing drill, and a problem with no public drill", () => {
    const broken = checkPublishable({
      ...shortener,
      drills: shortener.drills.map((drill) => ({
        ...drill,
        visibility: "hidden",
      })),
      rubric: [
        ...shortener.rubric,
        {
          key: "ghost",
          title: "Ghost",
          weight: 5,
          check: { check: "drill-passes", drillId: "ghost" },
        },
      ],
    });

    expect(!broken.ok && broken.issues).toEqual([
      "Rubric item ghost names a drill, ghost, the problem does not have.",
      "A problem needs at least one public drill for solvers to run.",
    ]);
  });

  test("refuses content that does not parse", () => {
    expect(checkPublishable({ slug: "Bad Slug" }).ok).toBe(false);
    expect(checkPublishable({ ...shortener, drills: [] }).ok).toBe(false);
  });
});

describe("a design with no client", () => {
  test("fails every drill instead of passing an empty run", () => {
    const empty = {
      ...emptyGraph(),
      nodes: [createNode("service", { id: "api" })],
    };

    expect(
      scoreSubmission(shortener, empty).drills.every((drill) => !drill.passed),
    ).toBe(true);
  });
});
