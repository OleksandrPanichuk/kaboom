import { type APIRequestContext, expect, type Page } from "@playwright/test";

import { installStripeStub } from "./stripe-stub";

export const PASSWORD = "e2e-password-123";

const STRIPE_STUB = `(${installStripeStub.toString()})();`;

const control = (page: Page) => ({ origin: new URL(page.url()).origin });

export const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;

export const passCaptcha = async (page: Page) => {
  await page.route("**/api/**", async (route) => {
    const headers = route.request().headers();

    if (headers["x-captcha-token"] !== undefined) {
      headers["x-captcha-token"] = "captcha-pass";
      headers["x-captcha-kind"] = "score";
    }

    await route.continue({ headers });
  });
};

export const stubStripe = (page: Page) =>
  page.route("https://js.stripe.com/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: STRIPE_STUB }),
  );

export const lastEmail = async (request: APIRequestContext, to: string) => {
  let found: { subject: string; text: string } | null = null;

  await expect
    .poll(async () => {
      const response = await request.get(
        `/api/e2e/emails/last?to=${encodeURIComponent(to)}`,
      );

      found = response.ok()
        ? ((await response.json()) as { subject: string; text: string })
        : null;

      return found !== null;
    })
    .toBe(true);

  return found!;
};

export const scriptModel = async (page: Page, steps: unknown[]) => {
  const response = await page.request.post("/api/e2e/llm/script", {
    data: { steps },
    headers: control(page),
  });

  expect(response.ok(), await response.text()).toBe(true);
};

export const signUp = async (page: Page, label: string) => {
  const email = uniqueEmail(label);

  await passCaptcha(page);
  await page.goto("/sign-up");
  await page.request.post("/api/e2e/rate-limits/reset", {
    headers: control(page),
  });
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/home/);

  return email;
};

export const verifyEmail = async (page: Page, email: string) => {
  const { text } = await lastEmail(page.request, email);
  const link = /https?:\/\/\S+verify-email\?token=[^\s"<]+/.exec(text)?.[0];

  expect(link, "the verification email carries a link").toBeTruthy();

  await page.goto(new URL(link!).pathname + new URL(link!).search);
  await expect(page.getByText(/verified/i).first()).toBeVisible();
};

export const payPendingSubscription = async (page: Page, email: string) => {
  const response = await page.request.post("/api/e2e/billing/pay", {
    data: { email },
    headers: control(page),
  });

  expect(response.ok(), await response.text()).toBe(true);
};

export const becomePro = async (page: Page, email: string) => {
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
};

const FAKE_SPEECH = `
  (() => {
    const state = { active: null, spoken: [] };
    window.__voice = state;

    class Recognition {
      lang = "";
      continuous = false;
      interimResults = false;
      start() {
        state.active = this;
        setTimeout(() => this.onstart?.(), 0);
      }
      stop() { this.finish(); }
      abort() { this.finish(); }
      finish() {
        if (state.active === this) state.active = null;
        setTimeout(() => this.onend?.(), 0);
      }
    }

    class Utterance {
      constructor(text) { this.text = text; }
    }

    window.SpeechRecognition = Recognition;
    window.SpeechSynthesisUtterance = Utterance;
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false,
        getVoices: () => [],
        cancel: () => {},
        speak: (utterance) => {
          state.spoken.push(utterance.text);
          setTimeout(() => utterance.onend?.(), 1200);
        },
      },
    });
  })();
`;

export const fakeSpeech = (page: Page) => page.addInitScript(FAKE_SPEECH);

export const sayAloud = async (page: Page, text: string) => {
  await page.waitForFunction(
    () =>
      (window as unknown as { __voice: { active: unknown } }).__voice.active !==
      null,
  );
  await page.evaluate((words) => {
    const { active } = (
      window as unknown as {
        __voice: {
          active: {
            onresult: (event: unknown) => void;
          };
        };
      }
    ).__voice;

    active.onresult({
      results: [{ isFinal: true, 0: { transcript: words } }],
    });
  }, text);
};

export const spoken = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __voice: { spoken: string[] } }).__voice.spoken,
  );
