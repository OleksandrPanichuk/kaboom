import { expect, test } from "@playwright/test";

import { scriptModel, signUp } from "../support";

test("a candidate starts an interview and the interviewer answers", async ({
  page,
}) => {
  await signUp(page, "interview");
  await page.goto("/problems/url-shortener");
  await page.getByRole("button", { name: /interview/i }).first().click();

  await expect(page).toHaveURL(/\/interviews\//);

  const conversation = page.getByRole("list", { name: "Conversation" });

  await expect(
    conversation.getByText(/what would you like to know/i),
  ).toBeVisible();

  await scriptModel(page, [
    { type: "text-delta", text: "About a hundred million redirects a day." },
  ]);
  await page
    .getByLabel("Message the interviewer")
    .fill("How many redirects a day should it serve?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    conversation.getByText("How many redirects a day should it serve?"),
  ).toBeVisible();
  await expect(
    conversation.getByText("About a hundred million redirects a day."),
  ).toBeVisible({ timeout: 20_000 });
});
