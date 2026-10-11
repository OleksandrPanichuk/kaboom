import { describe, expect, test } from "bun:test";

import { defaultHandle, randomHandle } from "./profile.handle";
import { HANDLE_PATTERN } from "./profiles.constants";

const ID = "1f0c2a9e-7b3d-4c11-9a2e-5d6f7a8b9c0d";

describe("a default handle", () => {
  test("is built from the name and the user's id", () => {
    expect(defaultHandle("Ada Lovelace", ID)).toBe("ada-lovelac-1f0c2a9e");
  });

  test.each([
    "Ada Lovelace",
    "  ",
    "Олександр",
    "a",
    "ab cdefghij klm",
    "__x__",
    "José Núñez",
  ])("fits the handle pattern for %p", (name) => {
    const pattern = new RegExp(HANDLE_PATTERN);

    expect(defaultHandle(name, ID)).toMatch(pattern);
    expect(randomHandle(name)).toMatch(pattern);
  });
});
