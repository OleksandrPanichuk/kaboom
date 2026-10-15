import { describe, expect, test } from "bun:test";

import { afterCommit, transaction } from "./executor";

describe("work after a commit", () => {
  test("waits for the outermost transaction to commit", async () => {
    const order: string[] = [];

    await transaction(async () => {
      await afterCommit(() => {
        order.push("after commit");

        return Promise.resolve();
      });
      await transaction(async () => {
        await afterCommit(() => {
          order.push("nested, after commit");

          return Promise.resolve();
        });
        order.push("nested");
      });
      order.push("outer");
    });

    expect(order).toEqual([
      "nested",
      "outer",
      "after commit",
      "nested, after commit",
    ]);
  });

  test("never runs for a transaction that rolls back", async () => {
    let ran = false;

    const failure = await transaction(async () => {
      await afterCommit(() => {
        ran = true;

        return Promise.resolve();
      });

      throw new Error("rolled back");
    }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(Error);
    expect(ran).toBe(false);
  });

  test("runs at once outside a transaction", async () => {
    let ran = false;

    await afterCommit(() => {
      ran = true;

      return Promise.resolve();
    });

    expect(ran).toBe(true);
  });
});
