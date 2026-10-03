import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { isUniqueViolation } from "./errors";
import { getExecutor } from "./executor";

describe("isUniqueViolation", () => {
  test("recognises the error drizzle throws for a duplicate key", async () => {
    const db = getExecutor();

    await db.execute(sql`create temp table unique_probe (id int primary key)`);
    await db.execute(sql`insert into unique_probe values (1)`);

    const error = await db
      .execute(sql`insert into unique_probe values (1)`)
      .then(
        () => null,
        (caught: unknown) => caught,
      );

    await db.execute(sql`drop table unique_probe`);

    expect(error).not.toBeNull();
    expect(isUniqueViolation(error)).toBe(true);
  });

  test("ignores other errors", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
