import { describe, expect, test } from "bun:test";

import { column, index, references, table } from "../data-model/fixtures";
import { emptyGraph } from "../graph";
import { runDrill } from "./drills";
import { checkPublishable } from "./publish";
import type { SchemaDrill } from "./schema";
import { scoreSubmission } from "./score";

const tables = (withAuthor: boolean) => [
  table("users", [column("id", "bigint", { primaryKey: true })]),
  table(
    "posts",
    [
      column("id", "bigint", { primaryKey: true }),
      ...(withAuthor ? [column("author_id", "bigint")] : []),
    ],
    withAuthor ? [index("by_author", ["author_id"])] : [],
  ),
];

const baseline = { ...emptyGraph(), nodes: tables(false), edges: [] };
const reference = {
  ...emptyGraph(),
  nodes: tables(true),
  edges: [references("posts", "author_id", "users")],
};

const drill = {
  kind: "schema",
  id: "authors",
  title: "Authors and their posts",
  visibility: "public",
  requirements: {
    relationships: [
      { cardinality: "one-to-many", parent: "users", child: "posts" },
    ],
    queries: [
      {
        id: "by-author",
        title: "A user's posts",
        from: "users",
        by: ["id"],
        to: "posts",
      },
    ],
  },
  expect: { forbid: ["keyless-table"] },
};

const problem = {
  slug: "tiny-blog",
  title: "Tiny blog",
  track: "data-model",
  difficulty: "easy",
  summary: "Users write posts.",
  statement: "Each user writes many posts.",
  baseline,
  drills: [drill],
  rubric: [
    {
      key: "authors",
      title: "Posts know their author",
      weight: 100,
      check: { check: "drill-passes", drillId: "authors" },
    },
  ],
  hints: [],
  reference: { graph: reference, notes: "A foreign key from posts to users." },
};

describe("schema drills", () => {
  test("publish a data-model problem whose reference scores 100 and baseline 0", () => {
    const check = checkPublishable(problem);

    expect(check).toMatchObject({ ok: true });
    expect(check.ok && scoreSubmission(check.problem, baseline).score).toBe(0);
  });

  test("fail a design with no relations, so the reference without edges passes nothing", () => {
    const check = checkPublishable(problem);

    if (!check.ok) throw new Error(check.issues.join(" "));

    const outcome = runDrill(check.problem.drills[0]!, {
      ...reference,
      edges: [],
    });

    expect(outcome.passed).toBe(false);
    expect(outcome.failures[0]).toBe(
      "No table references another, so the schema keeps no relationship at all.",
    );
  });

  test("report each requirement as an assertion, and each forbidden finding", () => {
    const check = checkPublishable(problem);

    if (!check.ok) throw new Error(check.issues.join(" "));

    const outcome = runDrill(check.problem.drills[0] as SchemaDrill, reference);

    expect(outcome.assertions.map((item) => [item.label, item.passed])).toEqual(
      [
        ["users to posts, one to many", true],
        ["A user's posts", true],
        ["No keyless table", true],
      ],
    );
  });

  test("refuse a schema drill without a relationship, or naming a table the designs lack", () => {
    const check = checkPublishable({
      ...problem,
      drills: [
        {
          ...drill,
          requirements: { columns: [{ table: "comments", name: "body" }] },
        },
      ],
    });

    expect(!check.ok && check.issues).toEqual([
      "Drill authors declares no relationship; a schema drill checks how tables relate.",
      "Drill authors names the table comments, which the baseline does not have.",
      "Drill authors names the table comments, which the reference solution does not have.",
    ]);
  });
});
