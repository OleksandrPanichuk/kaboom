import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const TYPICAL_CHANGE = 0.05;

export const monorepoPipeline: ProblemContentInput = {
  slug: "monorepo-pipeline",
  title: "CI pipeline for a monorepo",
  track: "devops",
  difficulty: "medium",
  tags: ["ci", "monorepo", "pipelines", "flaky-tests"],
  summary:
    "Get a one-line change from merge to production in under half an hour in a repository of sixty packages.",
  statement: `Design the pipeline that builds, checks and ships a monorepo of sixty packages, from a merge to production.

**What it does**

- Every merge to main is built, tested and deployed.
- Building the whole repository takes 30 minutes on one runner, its tests 60 minutes, and a deploy 5 minutes.

**How it is used**

- Most changes touch one to three packages, about 5 % of the repository.
- About once a week someone changes the shared library, and everything has to be rebuilt and tested.
- The team merges about forty times a day and waits for each change to reach production.

**What to watch**

- A typical change must reach production within 30 minutes, and a change to the shared library within an hour.
- About 15 % of test runs fail for no reason in the change, and people have stopped trusting red builds.
- Security asked for every deploy to be scanned, and nothing may ship untested.

The pipeline the team runs today is on the canvas. Change it.`,
  baseline: graph(
    [
      node("build", "pipeline-stage", "Build", {
        stage: "build",
        durationMinutes: 30,
      }),
      node("test", "pipeline-stage", "Test", {
        stage: "test",
        durationMinutes: 60,
        flakiness: 0.15,
      }),
      node("deploy", "pipeline-stage", "Deploy", {
        stage: "deploy",
        durationMinutes: 5,
      }),
    ],
    [
      edge("build", "test", "pipeline-next"),
      edge("test", "deploy", "pipeline-next"),
    ],
  ),
  drills: [
    {
      kind: "pipeline",
      id: "typical-change",
      title: "A typical change",
      description:
        "A change to two packages, about 5 % of the repository, must reach production within 30 minutes.",
      visibility: "public",
      changedShare: TYPICAL_CHANGE,
      expect: { maxLeadTimeMinutes: 30 },
    },
    {
      kind: "pipeline",
      id: "shared-library",
      title: "A change to the shared library",
      description:
        "A change that touches every package must reach production within an hour.",
      visibility: "public",
      changedShare: 1,
      expect: { maxLeadTimeMinutes: 60 },
    },
    {
      kind: "pipeline",
      id: "green-runs",
      title: "Runs people trust",
      description: "At least 95 % of runs of a typical change must go green.",
      visibility: "public",
      changedShare: TYPICAL_CHANGE,
      expect: { minGreenRate: 0.95 },
    },
    {
      kind: "pipeline",
      id: "gated-deploys",
      title: "Nothing ships unchecked",
      description: "Every deploy comes after a test stage and a security scan.",
      visibility: "public",
      changedShare: TYPICAL_CHANGE,
      expect: { forbid: ["untested-deploy", "unscanned-deploy"] },
    },
    {
      kind: "pipeline",
      id: "half-the-repo",
      title: "A refactor across half the repository",
      visibility: "hidden",
      changedShare: 0.5,
      expect: { maxLeadTimeMinutes: 45 },
    },
  ],
  rubric: [
    {
      key: "ships-a-typical-change-fast",
      title: "Ships a typical change within 30 minutes",
      weight: 25,
      check: { check: "drill-passes", drillId: "typical-change" },
    },
    {
      key: "ships-a-shared-change-in-time",
      title: "Ships a change to the shared library within an hour",
      weight: 20,
      check: { check: "drill-passes", drillId: "shared-library" },
    },
    {
      key: "keeps-runs-green",
      title: "Keeps 95 % of runs green despite flaky tests",
      weight: 15,
      check: { check: "drill-passes", drillId: "green-runs" },
    },
    {
      key: "gates-every-deploy",
      title: "Tests and scans everything it deploys",
      weight: 20,
      check: { check: "drill-passes", drillId: "gated-deploys" },
    },
    {
      key: "handles-a-wide-refactor",
      title: "Keeps a wide refactor under 45 minutes",
      weight: 10,
      check: { check: "drill-passes", drillId: "half-the-repo" },
    },
    {
      key: "keeps-what-it-built",
      title: "Keeps what it built in an artifact registry",
      weight: 10,
      check: { check: "has-node-kind", nodeKind: "artifact-registry", min: 1 },
    },
  ],
  interview: {
    opening:
      "Hi! Today we're looking at the CI/CD pipeline of a monorepo with sixty packages. Changes take far too long to reach production, and people don't trust the builds. What would you like to know?",
    facts: [
      {
        topic: "The repository",
        answer:
          "Sixty packages, services and libraries together, with one shared library that almost everything depends on.",
      },
      {
        topic: "Durations",
        answer:
          "Building everything takes 30 minutes on one runner, all the tests 60 minutes, and a deploy 5 minutes.",
      },
      {
        topic: "Changes",
        answer:
          "About forty merges a day. Most touch one to three packages, about 5 % of the repository. About once a week someone changes the shared library.",
      },
      {
        topic: "Targets",
        answer:
          "A typical change in production within 30 minutes, a shared-library change within an hour.",
      },
      {
        topic: "Flaky tests",
        answer:
          "About 15 % of test runs fail for no reason in the change. People rerun the pipeline until it passes, or merge anyway.",
      },
      {
        topic: "Security",
        answer:
          "Security wants every deploy scanned for vulnerable dependencies. A scan takes about 5 minutes and does not depend on the tests.",
      },
      {
        topic: "Runners",
        answer:
          "There are spare CI runners: a stage can be split over several, at about a minute of setup each.",
      },
      {
        topic: "Artifacts",
        answer:
          "Today the deploy stage builds the images again from source before shipping them.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on the durations, the shape of changes and the targets.",
      },
      {
        id: "high-level",
        minutes: 15,
        goal: "A pipeline that builds, tests, scans and deploys, in an order that does not waste time.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Meet both lead-time targets, deal with flaky tests, and ship exactly what was tested.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise the pipeline and what would change with three times the merges.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Clarifies the requirements before designing",
        signals: [
          "Asks how much of the repository a change usually touches",
          "Asks for the lead-time targets and how often the shared library changes",
          "Asks about flaky tests and what security requires",
        ],
        weight: 10,
      },
      {
        key: "orders-the-stages",
        dimension: "design",
        title: "Orders the stages so nothing waits needlessly",
        signals: [
          "Runs the scan beside the tests rather than after them",
          "Builds once and keeps the result in a registry",
          "Deploys what was tested, never a rebuild",
        ],
        weight: 15,
      },
      {
        key: "cuts-lead-time",
        dimension: "delivery",
        title: "Cuts the lead time for typical and wide changes",
        signals: [
          "Builds and tests only the packages a change affects",
          "Splits the slowest stage over several runners for changes that touch everything",
          "Checks the numbers against both targets",
        ],
        weight: 30,
      },
      {
        key: "handles-flaky-tests",
        dimension: "reliability",
        title: "Makes runs trustworthy again",
        signals: [
          "Retries a failed test run once rather than rerunning the whole pipeline",
          "Explains that retries hide flaky tests, and how to keep finding them",
        ],
        weight: 10,
      },
      {
        key: "makes-failures-visible",
        dimension: "operability",
        title: "Keeps the pipeline's health visible",
        signals: [
          "Tracks flaky tests and their rate rather than letting retries hide them",
          "Watches lead time and failure rate so a slowdown is noticed",
        ],
        weight: 15,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Thinks aloud and keeps the design and the explanation in step",
          "Names the trade-off behind each choice, such as runner cost against lead time",
          "Changes the design when a drill or a question shows a problem",
        ],
        weight: 20,
      },
    ],
    drillIds: ["typical-change", "shared-library", "green-runs"],
  },
  hints: [
    {
      title: "Why does a two-package change take so long?",
      body: "Every stage works on the whole repository, whatever the change touched. Most of the work is for packages nobody changed.",
      cost: 5,
    },
    {
      title: "Only what changed, and side by side",
      body: "Build and test only the affected packages, and run the scan beside the tests. For changes that touch everything, split the tests over several runners.",
      cost: 10,
    },
    {
      title: "Green runs and gates",
      body: "Retry a failed test run once, scan before deploying, and publish what the build produced to a registry the deploy ships from.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Build and tests run on the affected packages only, and the tests are split over four runners, so a typical change reaches production in about seven minutes and a change to the shared library in about 53. The scan runs beside the tests, after the build, and the deploy waits for both. A failed test run is retried once, which takes runs from 85 % green to about 98 %. The build publishes images to a registry with immutable tags, and the deploy ships those.",
    graph: graph(
      [
        node("build", "pipeline-stage", "Build", {
          stage: "build",
          durationMinutes: 30,
          affectedOnly: true,
        }),
        node("test", "pipeline-stage", "Test", {
          stage: "test",
          durationMinutes: 60,
          parallelism: 4,
          affectedOnly: true,
          flakiness: 0.15,
          retries: 1,
        }),
        node("scan", "pipeline-stage", "Scan", {
          stage: "scan",
          durationMinutes: 5,
        }),
        node("deploy", "pipeline-stage", "Deploy", {
          stage: "deploy",
          durationMinutes: 5,
          affectedOnly: true,
        }),
        node("registry", "artifact-registry", "Images", {
          immutableTags: true,
        }),
      ],
      [
        edge("build", "test", "pipeline-next"),
        edge("build", "scan", "pipeline-next"),
        edge("test", "deploy", "pipeline-next"),
        edge("scan", "deploy", "pipeline-next"),
        edge("build", "registry", "publishes"),
      ],
    ),
  },
};
