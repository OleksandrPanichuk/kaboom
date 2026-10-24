import { expect, test } from "@playwright/test";

import {
  becomePro,
  fakeSpeech,
  sayAloud,
  scriptModel,
  signUp,
  spoken,
} from "../support";

test("a Pro candidate talks to the interviewer and hears the answer", async ({
  page,
}) => {
  await fakeSpeech(page);

  const email = await signUp(page, "voice-pro");

  await becomePro(page, email);
  await page.goto("/problems/url-shortener");
  await page
    .getByRole("button", { name: /interview/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/interviews\//);

  const conversation = page.getByRole("list", { name: "Conversation" });

  await expect(
    conversation.getByText(/what would you like to know/i),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await expect(page.getByRole("button", { name: "Voice on" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("Listening, just talk…")).toBeVisible();
  await page.screenshot({ path: "test-results/voice-listening.png" });

  await scriptModel(page, [
    { type: "text-delta", text: "About a hundred million redirects a day." },
  ]);
  await sayAloud(page, "How many redirects a day should it serve?");

  await expect(
    conversation.getByText("How many redirects a day should it serve?"),
  ).toBeVisible();
  await expect(
    conversation.getByText("About a hundred million redirects a day."),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("The interviewer is speaking…")).toBeVisible();
  await page.screenshot({ path: "test-results/voice-speaking.png" });

  expect(await spoken(page)).toEqual([
    "About a hundred million redirects a day.",
  ]);
  await expect(page.getByText("Listening, just talk…")).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "Voice on" }).click();
  await expect(page.getByText("Listening, just talk…")).toHaveCount(0);
});

test("a Free candidate is pointed at Pro instead of a microphone", async ({
  page,
}) => {
  await fakeSpeech(page);
  await signUp(page, "voice-free");
  await page.goto("/problems/url-shortener");
  await page
    .getByRole("button", { name: /interview/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/interviews\//);

  await expect(
    page.getByRole("link", { name: "Talk to the interviewer: Pro" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Voice" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/voice-free.png" });
});
