import { expect, test } from "@playwright/test";

import { signUp } from "../support";

test("a first interview starts a streak, and the badges show what is left to earn", async ({
  page,
}) => {
  await signUp(page, "streak");
  await page.goto("/home");

  await expect(page.getByText("No streak yet")).toBeVisible();
  await expect(
    page.getByText("Solve a challenge or start an interview to begin one."),
  ).toBeVisible();

  await page.goto("/problems/url-shortener");
  await page
    .getByRole("button", { name: /interview/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/interviews\//);

  await page.goto("/home");
  await expect(page.getByText("1 day in a row")).toBeVisible();
  await expect(
    page.getByText("Done for today, and your longest yet."),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/streak-home.png" });

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Badges" })).toBeVisible();
  await expect(page.getByText("0 of 8")).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "A week running progress" }),
  ).toHaveAttribute("aria-valuenow", "1");
  await page.screenshot({
    path: "test-results/streak-badges.png",
    fullPage: true,
  });
});
