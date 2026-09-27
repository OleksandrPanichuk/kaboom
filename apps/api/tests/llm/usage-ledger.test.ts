import { createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { PostgresUsageLedger } from "@/adapters/llm/postgres.usage-ledger";

const usage = (inputTokens: number, outputTokens = 0, cacheReadTokens = 0) => ({
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheWriteTokens: 0,
});

describe("PostgresUsageLedger", () => {
  test("adds up a user's tokens for the day and refuses what would pass the budget", async () => {
    const user = await createUser();
    const ledger = new PostgresUsageLedger(
      10_000,
      () => new Date("2026-09-28T10:00:00Z"),
    );

    await ledger.record(user.id, usage(3_000, 1_000));
    await ledger.record(user.id, usage(2_000, 0, 10_000));

    expect(await ledger.spentToday(user.id)).toBe(7_000);
    expect(await ledger.reserve(user.id, 3_000)).toBe(true);
    expect(await ledger.reserve(user.id, 3_001)).toBe(false);
  });

  test("starts every day, and every user, from nothing", async () => {
    const user = await createUser();
    const other = await createUser();
    let now = new Date("2026-09-28T23:59:00Z");
    const ledger = new PostgresUsageLedger(10_000, () => now);

    await ledger.record(user.id, usage(9_000));
    now = new Date("2026-09-29T00:01:00Z");

    expect(await ledger.spentToday(user.id)).toBe(0);
    expect(await ledger.spentToday(other.id)).toBe(0);
  });
});
