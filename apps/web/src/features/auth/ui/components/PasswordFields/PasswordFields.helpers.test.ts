import { describe, expect, test } from "bun:test";

import { readPasswordPair } from "./PasswordFields.helpers";

const form = (password: string, confirmation: string) => {
  const data = new FormData();

  data.set("password", password);
  data.set("confirmation", confirmation);

  return data;
};

describe("readPasswordPair", () => {
  test("returns the password when both fields match", () => {
    expect(readPasswordPair(form("correct-horse", "correct-horse"))).toEqual({
      ok: true,
      password: "correct-horse",
    });
  });

  test("refuses two different passwords", () => {
    expect(readPasswordPair(form("correct-horse", "correct-hose")).ok).toBe(
      false,
    );
  });
});
