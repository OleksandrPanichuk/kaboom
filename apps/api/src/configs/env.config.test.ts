import { describe, expect, test } from "bun:test";

import { CheckedEnvSchema, EnvSchema, loadEnv, NodeEnv } from "./env.config";

const base = {
  NODE_ENV: NodeEnv.Test,
  DATABASE_URL: "postgresql://unused:unused@127.0.0.1:5432/unused",
};

describe("app identity in the environment", () => {
  test("defaults to a generic name and slug", () => {
    const env = loadEnv(base);

    expect(env.APP_NAME).toBe("App");
    expect(env.APP_SLUG).toBe("app");
  });

  test("sends mail under the app name unless told otherwise", () => {
    expect(loadEnv({ ...base, APP_NAME: "Acme" }).MAIL_FROM_NAME).toBe("Acme");
    expect(
      loadEnv({ ...base, APP_NAME: "Acme", MAIL_FROM_NAME: "Acme Support" })
        .MAIL_FROM_NAME,
    ).toBe("Acme Support");
  });

  test.each(["acme", "acme-2", "a1"])("accepts the slug %p", (slug) => {
    expect(EnvSchema.shape.APP_SLUG.safeParse(slug).success).toBe(true);
  });

  test.each([
    "Acme",
    "acme app",
    "acme:app",
    "-acme",
    "acme-",
    "acme--app",
    "",
  ])("rejects the slug %p", (slug) => {
    expect(EnvSchema.shape.APP_SLUG.safeParse(slug).success).toBe(false);
  });
});

describe("captcha settings in the environment", () => {
  test("treat empty values as unset rather than as zero or an error", () => {
    const env = loadEnv({
      ...base,
      RECAPTCHA_V3_SECRET: "",
      RECAPTCHA_V2_SECRET: " ",
      CAPTCHA_SCORE_THRESHOLD: "",
    });

    expect(env.RECAPTCHA_V3_SECRET).toBeUndefined();
    expect(env.RECAPTCHA_V2_SECRET).toBeUndefined();
    expect(env.CAPTCHA_SCORE_THRESHOLD).toBe(0.5);
  });

  test("read a threshold that is set", () => {
    expect(
      loadEnv({ ...base, CAPTCHA_SCORE_THRESHOLD: "0.7" })
        .CAPTCHA_SCORE_THRESHOLD,
    ).toBe(0.7);
  });
});

describe("metrics settings in the environment", () => {
  test("treat an empty namespace as unset and default the flush interval", () => {
    const env = loadEnv({ ...base, CLOUDWATCH_METRICS_NAMESPACE: "" });

    expect(env.CLOUDWATCH_METRICS_NAMESPACE).toBeUndefined();
    expect(env.CLOUDWATCH_METRICS_FLUSH_SECONDS).toBe(60);
  });
});

describe("billing settings in the environment", () => {
  test("default to no key, no tax and the two lookup keys", () => {
    const env = loadEnv(base);

    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
    expect(env.BILLING_TAX_ENABLED).toBe(false);
    expect(env.BILLING_PRICE_PRO_MONTHLY).toBe("pro_monthly");
    expect(env.BILLING_PRICE_PRO_LIFETIME).toBe("pro_lifetime");
  });

  test("require the webhook secret once a key is set", () => {
    const issues = (source: Record<string, string>) =>
      CheckedEnvSchema.safeParse({ ...base, ...source }).error?.issues.map(
        (issue) => issue.path.join("."),
      ) ?? [];

    expect(issues({ STRIPE_SECRET_KEY: "sk_test_1" })).toEqual([
      "STRIPE_WEBHOOK_SECRET",
    ]);
    expect(
      issues({
        STRIPE_SECRET_KEY: "sk_test_1",
        STRIPE_WEBHOOK_SECRET: "whsec_1",
      }),
    ).toEqual([]);
    expect(
      issues({ STRIPE_SECRET_KEY: " ", STRIPE_WEBHOOK_SECRET: "" }),
    ).toEqual([]);
  });
});
