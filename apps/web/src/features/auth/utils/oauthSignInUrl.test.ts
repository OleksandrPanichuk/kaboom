import { describe, expect, test } from "bun:test";

import { oauthSignInUrl } from "./oauthSignInUrl";

const returnTo = (url: string) =>
  new URL(url, "http://localhost").searchParams.get("redirectTo");

describe("oauthSignInUrl", () => {
  test("starts the provider's flow and comes back through sign-in", () => {
    const url = oauthSignInUrl("github", "/designs/42");

    expect(url.startsWith("/api/auth/oauth/github?")).toBe(true);
    expect(returnTo(url)).toBe("/sign-in?redirect=%2Fdesigns%2F42");
  });

  test("returns home when there is nowhere else to go", () => {
    expect(returnTo(oauthSignInUrl("google", undefined))).toBe(
      "/sign-in?redirect=%2F",
    );
  });

  test("never carries an outside redirect through the provider", () => {
    expect(returnTo(oauthSignInUrl("google", "https://evil.example"))).toBe(
      "/sign-in?redirect=%2F",
    );
  });
});
