import { expect, test } from "@playwright/test";

test("the landing page and public pricing open without signing in", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start practising free" }).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "Pricing" }).first().click();

  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByText("Pro").first()).toBeVisible();
});
