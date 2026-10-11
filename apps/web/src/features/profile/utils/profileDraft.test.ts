import { describe, expect, test } from "bun:test";

import {
  filledLinks,
  initialsOf,
  linkLabel,
  type ProfileDraft,
  profileDraftErrors,
} from "./profileDraft";

const DRAFT: ProfileDraft = {
  handle: "ada",
  displayName: "Ada Lovelace",
  bio: "",
  links: ["", "https://example.com/ada"],
  visible: true,
};

describe("a profile draft", () => {
  test("has no errors when it follows the rules", () => {
    expect(profileDraftErrors(DRAFT)).toEqual({});
  });

  test("names each field that breaks a rule", () => {
    const errors = profileDraftErrors({
      ...DRAFT,
      handle: "-ada",
      displayName: "   ",
      bio: "x".repeat(281),
      links: ["javascript:alert(1)"],
    });

    expect(Object.keys(errors).sort()).toEqual([
      "bio",
      "displayName",
      "handle",
      "links",
    ]);
    expect(errors).toMatchObject({
      displayName: "Enter a name to show.",
      bio: "At most 280 characters.",
      links: "Each link starts with https:// or http://.",
    });
  });

  test("ignores empty link rows", () => {
    expect(filledLinks([" ", "https://a.io ", ""])).toEqual(["https://a.io"]);
  });
});

describe("initials and link labels", () => {
  test("take the first letters of two words", () => {
    expect(initialsOf("ada lovelace byron")).toBe("AL");
    expect(initialsOf("Олександр")).toBe("О");
  });

  test("show a link by host and path", () => {
    expect(linkLabel("https://www.github.com/ada")).toBe("github.com/ada");
    expect(linkLabel("https://example.com/")).toBe("example.com");
  });
});
