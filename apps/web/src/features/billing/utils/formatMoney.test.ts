import { describe, expect, test } from "bun:test";

import { formatMoney } from "./formatMoney";

describe("formatting an amount in its smallest unit", () => {
  test("drops cents from a round amount and keeps them otherwise", () => {
    expect(formatMoney(1_200, "usd")).toBe("$12");
    expect(formatMoney(1_299, "usd")).toBe("$12.99");
  });

  test("reads a currency without minor units as it is", () => {
    expect(formatMoney(1_500, "jpy")).toBe("¥1,500");
  });
});
