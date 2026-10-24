import { expect, test } from "@playwright/test";

import { signUp } from "../support";

test("Home offers this week's challenge, and its page shows the standings", async ({
  page,
}) => {
  await signUp(page, "weekly");
  await page.goto("/home");

  const card = page.getByRole("region", { name: "This week's challenge" });

  await expect(card).toBeVisible();
  await expect(
    card.getByText("Nobody has tried it yet. Be the first."),
  ).toBeVisible();
  await expect(card.getByText(/days? left|hours? left/)).toBeVisible();
  await page.screenshot({ path: "test-results/weekly-home.png" });

  const title = await card.locator("p").nth(1).innerText();

  await card.getByRole("link", { name: "Standings" }).click();
  await expect(page).toHaveURL(/\/weekly$/);
  await expect(
    page.getByRole("heading", { name: "This week's challenge" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("No scores yet this week.")).toBeVisible();
  await page.screenshot({
    path: "test-results/weekly-page.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 375, height: 800 });
  await page.screenshot({
    path: "test-results/weekly-page-mobile.png",
    fullPage: true,
  });
  await page.goto("/home");
  await expect(card).toBeVisible();
  await page.screenshot({
    path: "test-results/weekly-home-mobile.png",
    fullPage: true,
  });

  await card.getByRole("link", { name: "Take it on" }).click();
  await expect(page).toHaveURL(/\/problems\//);
});
