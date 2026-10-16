import { expect, test } from "@playwright/test";

import { signUp } from "../support";

test("a solver starts a problem and submits the starting design", async ({
  page,
}) => {
  await signUp(page, "problem");
  await page.goto("/problems/url-shortener");

  await page.getByRole("button", { name: "Start problem" }).click();
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();

  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText(/\d+\s*\/\s*100/).first()).toBeVisible({
    timeout: 30_000,
  });
});
