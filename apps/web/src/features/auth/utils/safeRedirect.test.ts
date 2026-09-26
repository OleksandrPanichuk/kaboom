import { describe, expect, test } from "bun:test";

import { DEFAULT_REDIRECT, safeRedirect } from "./safeRedirect";

describe("safeRedirect", () => {
  test.each([
    ["/designs", "/designs"],
    ["/designs/42?tab=revisions#top", "/designs/42?tab=revisions#top"],
    ["/", "/"],
  ])("keeps the in-app path %s", (value, expected) => {
    expect(safeRedirect(value)).toBe(expected);
  });

  test.each([
    ["an absolute URL", "https://evil.example/steal"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash trick", "/\\evil.example"],
    ["a script URL", "javascript:alert(1)"],
    ["a relative path", "designs"],
    ["an empty string", ""],
    ["a non-string", 42],
    ["nothing", undefined],
  ])("refuses %s", (_, value) => {
    expect(safeRedirect(value)).toBe(DEFAULT_REDIRECT);
  });
});
