import { describe, expect, test } from "bun:test";

import { emptyGraph } from "../graph";
import { toDDL } from "./ddl";
import { column, index, references, table } from "./fixtures";

describe("toDDL", () => {
  test("writes tables, then foreign keys, then indexes", () => {
    const graph = {
      ...emptyGraph(),
      nodes: [
        table("users", [
          column("id", "bigint", { primaryKey: true }),
          column("email", "text", { unique: true }),
          column("manager_id", "bigint", { nullable: true }),
        ]),
        table(
          "post_tags",
          [
            column("post_id", "bigint", { primaryKey: true }),
            column("tag_id", "bigint", { primaryKey: true }),
          ],
          [index("by_tag", ["tag_id"], true)],
        ),
      ],
      edges: [
        references("users", "manager_id", "users", "id", "set-null"),
        references("post_tags", "post_id", "users", "id", "cascade"),
      ],
    };

    expect(toDDL(graph)).toBe(
      [
        'CREATE TABLE "users" (\n  "id" bigint NOT NULL,\n  "email" text NOT NULL UNIQUE,\n  "manager_id" bigint,\n  PRIMARY KEY ("id")\n);',
        'CREATE TABLE "post_tags" (\n  "post_id" bigint NOT NULL,\n  "tag_id" bigint NOT NULL,\n  PRIMARY KEY ("post_id", "tag_id")\n);',
        'ALTER TABLE "users" ADD FOREIGN KEY ("manager_id") REFERENCES "users" ("id") ON DELETE SET NULL;',
        'ALTER TABLE "post_tags" ADD FOREIGN KEY ("post_id") REFERENCES "users" ("id") ON DELETE CASCADE;',
        'CREATE UNIQUE INDEX "post_tags_tag_id_idx" ON "post_tags" ("tag_id");',
      ].join("\n\n"),
    );
  });

  test("quotes names, and writes nothing for a design without tables", () => {
    const graph = {
      ...emptyGraph(),
      nodes: [
        table('odd "name"', [column("id", "uuid", { primaryKey: true })]),
      ],
      edges: [],
    };

    expect(toDDL(graph)).toStartWith('CREATE TABLE "odd ""name"""');
    expect(toDDL(emptyGraph())).toBe("");
  });
});
