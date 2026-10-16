import { expect, test } from "@playwright/test";

import { signUp, verifyEmail } from "../support";

test("a visitor signs up, lands on home and verifies their email", async ({
  page,
}) => {
  const email = await signUp(page, "sign-up");

  await expect(page.getByText(/confirm/i).first()).toBeVisible();

  await verifyEmail(page, email);
});
