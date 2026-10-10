import { describe, expect, test } from "bun:test";

import { pinnedVersion } from "./pinnedVersion";

describe("pinnedVersion", () => {
  test("names an attempt's version only while the problem has a newer one", () => {
    expect(pinnedVersion({ problemVersion: 1, latestVersion: 2 })).toBe(1);
    expect(pinnedVersion({ problemVersion: 2, latestVersion: 2 })).toBe(
      undefined,
    );
    expect(pinnedVersion(null)).toBe(undefined);
  });
});
