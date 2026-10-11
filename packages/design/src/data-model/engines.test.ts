import { describe, expect, test } from "bun:test";

import type { Column } from "../catalogue";
import { createGroup, emptyGraph } from "../graph";
import { lints } from "../lints/lints";
import { engineIssues, engineOf, supportsType, writeType } from "./engines";
import { column, table } from "./fixtures";

const typed = (type: Column["type"], extra: Partial<Column> = {}): Column => ({
  ...column("c", type),
  ...extra,
});

describe("engines", () => {
  test("write each type the way its engine spells it", () => {
    const email = typed("varchar", { length: 254 });
    const money = typed("numeric", { precision: 10, scale: 2 });
    const status = typed("enum", { values: ["new", "paid"] });

    expect(
      (["postgres", "mysql", "sqlite"] as const).map((engine) => [
        writeType(engine, typed("uuid")),
        writeType(engine, email),
        writeType(engine, money),
        writeType(engine, typed("timestamptz")),
        writeType(engine, status),
      ]),
    ).toEqual([
      ["uuid", "varchar(254)", "numeric(10, 2)", "timestamptz", "c_type"],
      [
        "char(36)",
        "varchar(254)",
        "decimal(10, 2)",
        "timestamp",
        "enum('new', 'paid')",
      ],
      ["text", "text", "numeric", "text", "text"],
    ]);
    expect(supportsType("mysql", "jsonb")).toBe(false);
    expect(supportsType("sqlite", "jsonb")).toBe(false);
  });

  test("name what an engine cannot do", () => {
    const users = table("users", [
      column("id", "bigint", { primaryKey: true }),
      column("code", "bigint"),
    ]);

    expect(engineIssues("mysql", users, typed("jsonb"))).toEqual([
      "MySQL has no jsonb type for users.c.",
    ]);
    expect(engineIssues("mysql", users, typed("varchar"))).toEqual([
      "users.c is a varchar without a length, which MySQL refuses.",
    ]);
    expect(
      engineIssues(
        "postgres",
        users,
        typed("timestamptz", { onUpdate: "now" }),
      ),
    ).toEqual([
      "PostgreSQL cannot set users.c to now on update by itself; it takes a trigger.",
    ]);
    expect(
      engineIssues("sqlite", users, {
        ...users.props.columns[1]!,
        generated: { kind: "identity", always: false },
      }),
    ).toEqual([
      "SQLite numbers rows only for an integer primary key of its own, which users.code is not.",
    ]);
  });

  test("a table takes the engine of its database, and PostgreSQL outside one", () => {
    const loose = table("loose", [column("id", "jsonb", { primaryKey: true })]);
    const placed = {
      ...table("placed", [column("id", "jsonb", { primaryKey: true })]),
      groupId: "shop",
    };
    const graph = {
      ...emptyGraph(),
      groups: [
        createGroup({
          id: "shop",
          kind: "database",
          label: "Shop",
          engine: "mysql",
        }),
      ],
      nodes: [loose, placed],
    };

    expect([engineOf(graph, loose), engineOf(graph, placed)]).toEqual([
      "postgres",
      "mysql",
    ]);
    expect(
      lints["engine-unsupported"].run(graph).map((hit) => hit.nodeIds),
    ).toEqual([["placed"]]);
  });
});
