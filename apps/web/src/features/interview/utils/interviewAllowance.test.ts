import { describe, expect, test } from "bun:test";

import {
  allowanceLeft,
  describeAllowance,
  type InterviewAllowance,
} from "./interviewAllowance";

const quota = (patch: Partial<InterviewAllowance>): InterviewAllowance => ({
  limit: 1,
  per: "week",
  used: 0,
  resetsAt: "2026-10-26T00:00:00.000Z",
  ...patch,
});

describe("describeAllowance", () => {
  test("says what is left in the period", () => {
    expect(describeAllowance(quota({ limit: 3, per: "day", used: 1 }))).toBe(
      "2 of 3 interviews left today.",
    );
    expect(describeAllowance(quota({}))).toBe(
      "1 of 1 interview left this week.",
    );
  });

  test("says so once it is used up", () => {
    expect(describeAllowance(quota({ used: 1 }))).toBe(
      "You have used this week's interview.",
    );
    expect(describeAllowance(quota({ limit: 3, per: "day", used: 3 }))).toBe(
      "You have used today's interviews.",
    );
  });

  test("never goes below zero", () => {
    expect(allowanceLeft(quota({ used: 5 }))).toBe(0);
  });
});
