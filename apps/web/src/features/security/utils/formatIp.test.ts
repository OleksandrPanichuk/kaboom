import { describe, expect, test } from "bun:test";

import { formatIp } from "./formatIp";

describe("formatIp", () => {
  test.each([
    ["::ffff:192.168.148.9", "192.168.148.9"],
    ["203.0.113.7", "203.0.113.7"],
    ["2001:db8::1", "2001:db8::1"],
  ])("shows %s as %s", (ip, expected) => {
    expect(formatIp(ip)).toBe(expected);
  });

  test("shows nothing for an unknown address", () => {
    expect(formatIp(null)).toBeNull();
  });
});
