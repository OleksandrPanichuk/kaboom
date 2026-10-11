import { describe, expect, test } from "bun:test";

import { ColumnSchema } from "./columns";

const base = { id: "c", name: "c", type: "text" } as const;

const problems = (column: Record<string, unknown>) => {
  const result = ColumnSchema.safeParse({ ...base, ...column });

  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
};

describe("columns", () => {
  test("parse a column stored before parameters existed without adding anything", () => {
    const stored = {
      id: "email",
      name: "email",
      type: "varchar",
      nullable: false,
      primaryKey: false,
      unique: true,
    } as const;

    expect(ColumnSchema.parse(stored)).toEqual(stored);
  });

  test("take a length, a precision or values only where the type has them", () => {
    expect(problems({ type: "varchar", length: 254 })).toEqual([]);
    expect(problems({ type: "text", length: 254 })).toEqual([
      "c has a length, which only varchar and char take",
    ]);
    expect(problems({ type: "numeric", precision: 10, scale: 2 })).toEqual([]);
    expect(problems({ type: "numeric", precision: 2, scale: 3 })).toEqual([
      "c has a scale larger than its precision",
    ]);
    expect(problems({ type: "enum" })).toEqual(["c is an enum without values"]);
    expect(problems({ type: "enum", values: ["a", "a"] })).toEqual([
      "c repeats an enum value",
    ]);
  });

  test("default to now, a uuid or a literal only where it fits", () => {
    expect(problems({ type: "timestamptz", default: { kind: "now" } })).toEqual(
      [],
    );
    expect(problems({ type: "integer", default: { kind: "now" } })).toEqual([
      "c defaults to now, which only a date or time can",
    ]);
    expect(problems({ type: "text", default: { kind: "uuid" } })).toEqual([
      "c defaults to a new uuid but is not a uuid",
    ]);
    expect(
      problems({
        type: "enum",
        values: ["new"],
        default: { kind: "literal", value: "old" },
      }),
    ).toEqual(["c defaults to old, which is not one of its values"]);
    expect(
      problems({ type: "integer", default: { kind: "literal", value: "ten" } }),
    ).toEqual(["c defaults to ten, which is not a number"]);
  });

  test("generate an identity only for a required integer, and never beside a default", () => {
    expect(
      problems({
        type: "bigint",
        generated: { kind: "identity", always: true },
      }),
    ).toEqual([]);
    expect(
      problems({ type: "uuid", generated: { kind: "identity", always: true } }),
    ).toEqual(["c is an identity, which only an integer can be"]);
    expect(
      problems({
        type: "bigint",
        nullable: true,
        generated: { kind: "identity", always: false },
        default: { kind: "literal", value: "1" },
      }),
    ).toEqual([
      "c is generated, so it cannot have a default too",
      "c is an identity, so it cannot be null",
    ]);
  });

  test("update to now only a timestamp, and check only what a type can hold", () => {
    expect(problems({ type: "date", onUpdate: "now" })).toEqual([
      "c updates to now, which only a timestamp can",
    ]);
    expect(problems({ type: "text", checks: { min: 1 } })).toEqual([
      "c has a minimum or maximum, which only a number can",
    ]);
    expect(problems({ type: "integer", checks: { min: 5, max: 1 } })).toEqual([
      "c has a minimum above its maximum",
    ]);
    expect(
      problems({ type: "varchar", length: 3, checks: { minLength: 5 } }),
    ).toEqual(["c has a minimum length above its length"]);
  });
});
