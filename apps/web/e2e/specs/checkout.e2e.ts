import { expect, test } from "@playwright/test";

import { payPendingSubscription, signUp, stubStripe } from "../support";

test("a signed-in user subscribes to Pro and the plan shows once paid", async ({
  page,
}) => {
  const email = await signUp(page, "checkout");

  await stubStripe(page);
  await page.goto("/pricing");
  await page.getByRole("link", { name: "Get Pro monthly" }).click();

  await expect(page).toHaveURL(/\/pricing\/checkout\?offer=pro_monthly/);

  const subscribe = page.getByRole("button", { name: /^Subscribe for/ });

  await expect(subscribe).toBeEnabled({ timeout: 20_000 });
  await subscribe.click();

  await expect(page).toHaveURL(/\/pricing\/checkout\/complete/);

  await payPendingSubscription(page, email);

  await expect
    .poll(async () => {
      const response = await page.request.get("/api/billing/me");

      return ((await response.json()) as { plan: string }).plan;
    })
    .toBe("pro");

  await page.goto("/settings/billing");
  await expect(
    page.getByRole("heading", { name: "Pro", level: 2 }),
  ).toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
});
