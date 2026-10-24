import { expect, test } from "@playwright/test";

import { scriptModel, signUp } from "../support";

const RUBRIC = [
  "clarifies-requirements",
  "estimates-capacity",
  "designs-the-core",
  "scales-the-read-path",
  "survives-failures",
  "communicates",
];

test("on Free, one interview a week, a review without its reasoning, and no replay", async ({
  page,
}) => {
  await signUp(page, "plan-limits");
  await page.goto("/problems/url-shortener");

  await expect(
    page.getByText("1 of 1 interview left this week."),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/plan-allowance.png" });

  await page
    .getByRole("button", { name: /interview/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/interviews\//);

  const conversation = page.getByRole("list", { name: "Conversation" });

  await scriptModel(page, [
    { type: "text-delta", text: "About a hundred million." },
  ]);
  await page
    .getByLabel("Message the interviewer")
    .fill("How many redirects a day?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(conversation.getByText("About a hundred million.")).toBeVisible({
    timeout: 20_000,
  });

  await scriptModel(page, [
    {
      type: "tool-use",
      id: "review-1",
      name: "submit_review",
      input: {
        summary: "A clear start that asked about traffic first.",
        strengths: ["Asked about traffic before drawing."],
        improvements: ["Estimate the storage before choosing a database."],
        items: RUBRIC.map((key) => ({
          key,
          score: 2,
          rationale: `${key} was solid.`,
          citations: ["M2"],
        })),
      },
    },
  ]);
  await page.getByRole("button", { name: "End interview" }).first().click();
  await page.getByRole("button", { name: "End interview" }).last().click();

  await page.getByRole("link", { name: "Review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByRole("heading", { name: "Rubric" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText("The reasoning behind each score is part of Pro"),
  ).toBeVisible();
  await expect(
    page.getByText("Edits to your design are part of Pro"),
  ).toBeVisible();
  await expect(page.getByText("clarifies-requirements was solid.")).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: /Replay is part of Pro/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/plan-review.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.screenshot({
    path: "test-results/plan-review-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto(page.url().replace(/\/review$/, "/replay"));
  await expect(
    page.getByRole("heading", { name: "Replay is part of Pro" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/plan-replay.png" });

  await page.goto("/problems/url-shortener");
  await expect(
    page.getByText("You have used this week's interview."),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/plan-used.png" });
});

test("on Free, five designs of your own, and the Designs page says when they are used up", async ({
  page,
}) => {
  await signUp(page, "design-limit");

  for (const name of ["Cache", "Queue", "Feed", "Search", "Billing"]) {
    const created = await page.request.post("/api/designs", {
      data: { name },
      headers: { "sec-fetch-site": "same-origin" },
    });

    expect(created.ok(), await created.text()).toBe(true);
  }

  await page.goto("/designs");
  await expect(page.getByText("5 of 5 designs")).toBeVisible();
  await expect(
    page.getByText("You have as many designs as Free keeps"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "New design" })).toBeDisabled();
  await page.screenshot({ path: "test-results/designs-full.png" });

  await page.getByRole("button", { name: "Actions for Billing" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete design" }).click();
  await expect(page.getByText("4 of 5 designs")).toBeVisible();
  await expect(page.getByRole("button", { name: "New design" })).toBeEnabled();
});
