import { describe, expect, test } from "bun:test";

import type { TableIndex } from "../catalogue";
import { column, table } from "./fixtures";
import { servesLookup } from "./indexes";

const jobs = (indexes: TableIndex[]) =>
  table(
    "jobs",
    [
      column("id", "bigint", { primaryKey: true }),
      column("email", "text"),
      column("status", "text"),
      column("run_at", "timestamptz"),
      column("payload", "jsonb"),
      column("body", "text"),
    ],
    indexes,
  );

const index = (
  columns: string[],
  extra: Partial<TableIndex> = {},
): TableIndex => ({
  id: columns.join("_"),
  columns,
  unique: false,
  ...extra,
});

describe("servesLookup", () => {
  test("a case-insensitive lookup needs lower(), and lower() serves nothing else", () => {
    const lowered = jobs([index(["email"], { lower: ["email"] })]);

    expect(servesLookup(lowered, { equal: [], lower: ["email"] })).toBe(true);
    expect(servesLookup(lowered, { equal: ["email"] })).toBe(false);
    expect(
      servesLookup(jobs([index(["email"])]), { equal: [], lower: ["email"] }),
    ).toBe(false);
  });

  test("a range follows the equality columns in a btree, never in a hash", () => {
    const pair = jobs([index(["status", "run_at"])]);

    expect(servesLookup(pair, { equal: ["status"], range: "run_at" })).toBe(
      true,
    );
    expect(servesLookup(pair, { equal: [], range: "run_at" })).toBe(false);
    expect(
      servesLookup(jobs([index(["run_at"], { method: "hash" })]), {
        equal: [],
        range: "run_at",
      }),
    ).toBe(false);
    expect(
      servesLookup(jobs([index(["email"], { method: "hash" })]), {
        equal: ["email"],
      }),
    ).toBe(true);
  });

  test("a partial index serves only the filter it was built for", () => {
    const pending = jobs([
      index(["run_at"], {
        where: { column: "status", op: "=", value: "pending" },
      }),
    ]);
    const lookup = {
      equal: [],
      order: ["run_at"],
      where: { column: "status", op: "=" as const, value: "pending" },
    };

    expect(servesLookup(pending, lookup)).toBe(true);
    expect(
      servesLookup(pending, {
        ...lookup,
        where: { ...lookup.where, value: "done" },
      }),
    ).toBe(false);
    expect(servesLookup(pending, { equal: [], order: ["run_at"] })).toBe(false);
    expect(servesLookup(jobs([index(["status", "run_at"])]), lookup)).toBe(
      true,
    );
  });

  test("contains needs GIN, and text search GIN or FULLTEXT", () => {
    expect(
      servesLookup(jobs([index(["payload"], { method: "gin" })]), {
        equal: [],
        match: { column: "payload", kind: "contains" },
      }),
    ).toBe(true);
    expect(
      servesLookup(jobs([index(["payload"])]), {
        equal: [],
        match: { column: "payload", kind: "contains" },
      }),
    ).toBe(false);
    expect(
      servesLookup(jobs([index(["body"], { method: "fulltext" })]), {
        equal: [],
        match: { column: "body", kind: "text-search" },
      }),
    ).toBe(true);
  });
});
