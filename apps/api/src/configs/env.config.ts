import z from "zod";

import { LogLevel } from "@/shared/types";

export enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test",
}

const appPath = (fallback: string) =>
  z
    .string()
    .trim()
    .regex(/^\/[^\s?#]*$/, "Use an absolute path such as /verify-email")
    .default(fallback);

const emptyAsUnset = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const EnvSchema = z.object({
  APP_NAME: z.string().trim().min(1).default("App"),
  APP_SLUG: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, digits and single hyphens, such as my-app",
    )
    .default("app"),
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.Development),
  PORT: z.coerce.number().int().positive().min(0).max(65535).default(8080),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(200).default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .default(30 * 1000),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(
          z
            .url({ protocol: /^https?$/ })
            .refine(
              (value) => new URL(value).origin === value,
              "Use an exact origin without a path or trailing slash",
            ),
        )
        .min(1),
    ),
  LOG_LEVEL: z.enum(LogLevel).optional(),
  LOG_PRETTY: z.stringbool().optional(),
  SESSIONS_REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
  SESSIONS_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24 * 7)
    .default(60 * 60 * 24 * 7),
  APP_URL: z
    .url({ protocol: /^https?$/ })
    .default("http://localhost:3000")
    .refine(
      (value) => new URL(value).origin === value,
      "Use an exact origin without a path or trailing slash",
    ),
  APP_VERIFY_EMAIL_PATH: appPath("/verify-email"),
  APP_RESET_PASSWORD_PATH: appPath("/reset-password"),
  APP_CONFIRM_EMAIL_CHANGE_PATH: appPath("/confirm-email-change"),
  APP_SECURITY_PATH: appPath("/settings/security"),
  EMAIL_VERIFICATION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24 * 7)
    .default(60 * 60 * 24),
  PASSWORD_RESET_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24)
    .default(60 * 60),
  STORAGE_S3_BUCKET: z.string().trim().min(1).optional(),
  STORAGE_S3_REGION: z.string().trim().min(1).default("us-east-1"),
  STORAGE_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  STORAGE_S3_ENDPOINT: z.url({ protocol: /^https?$/ }).optional(),
  STORAGE_S3_FORCE_PATH_STYLE: z.stringbool().optional(),

  SENTRY_DSN: z.preprocess(
    emptyAsUnset,
    z.url({ protocol: /^https?$/ }).optional(),
  ),
  SENTRY_ENVIRONMENT: z.preprocess(emptyAsUnset, z.string().min(1).optional()),
  SENTRY_RELEASE: z.preprocess(emptyAsUnset, z.string().min(1).optional()),

  RECAPTCHA_V3_SECRET: z.preprocess(emptyAsUnset, z.string().min(1).optional()),
  RECAPTCHA_V2_SECRET: z.preprocess(emptyAsUnset, z.string().min(1).optional()),
  CAPTCHA_SCORE_THRESHOLD: z.preprocess(
    emptyAsUnset,
    z.coerce.number().min(0).max(1).default(0.5),
  ),

  MAIL_FROM_NAME: z.string().trim().min(1).optional(),
  MAIL_FROM_ADDRESS: z.email().default("no-reply@example.com"),
  SMTP_URL: z.url({ protocol: /^smtp$/ }).optional(),

  JOBS_REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
  CACHE_REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
  RATE_LIMIT_REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
  REALTIME_REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),

  TRUSTED_PROXY_HEADER: z.string().trim().min(1).toLowerCase().optional(),
  TRUSTED_PROXY_DEPTH: z.coerce.number().int().min(1).max(10).default(1),

  OAUTH_STATE_SECRET: z.string().min(32).optional(),
  OAUTH_REDIRECT_BASE: z
    .url({ protocol: /^https?$/ })
    .refine(
      (value) => new URL(value).origin === value,
      "Use an exact origin without a path or trailing slash",
    )
    .optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

  CLOUDWATCH_METRICS_NAMESPACE: z.preprocess(
    emptyAsUnset,
    z.string().trim().min(1).max(255).optional(),
  ),
  CLOUDWATCH_METRICS_FLUSH_SECONDS: z.preprocess(
    emptyAsUnset,
    z.coerce.number().int().min(10).max(300).default(60),
  ),
});

type ParsedEnv = z.infer<typeof EnvSchema>;

type RequiredOutsideTestKey = NonNullable<
  {
    [K in keyof ParsedEnv]: undefined extends ParsedEnv[K] ? K : never;
  }[keyof ParsedEnv]
>;

const requireOutsideTest =
  (...keys: RequiredOutsideTestKey[]) =>
  (env: ParsedEnv, ctx: z.RefinementCtx): void => {
    if (env.NODE_ENV === NodeEnv.Test) return;

    for (const key of keys) {
      if (env[key] !== undefined) continue;

      ctx.addIssue({
        code: "custom",
        path: [key],
        message: 'Required unless NODE_ENV is "test"',
      });
    }
  };

type ParsedEnvWithDefaults = ParsedEnv & { MAIL_FROM_NAME: string };

export const withDerivedDefaults = (env: ParsedEnv): ParsedEnvWithDefaults => ({
  ...env,
  MAIL_FROM_NAME: env.MAIL_FROM_NAME ?? env.APP_NAME,
});

const CheckedEnvSchema = EnvSchema.superRefine(
  requireOutsideTest(
    "SESSIONS_REDIS_URL",
    "SMTP_URL",
    "JOBS_REDIS_URL",
    "CACHE_REDIS_URL",
    "STORAGE_S3_BUCKET",
    "STORAGE_S3_ACCESS_KEY_ID",
    "STORAGE_S3_SECRET_ACCESS_KEY",
  ),
).transform(withDerivedDefaults);

export type Env = z.output<typeof CheckedEnvSchema>;

export const loadEnv = (source: unknown = Bun.env): Env => {
  const result = CheckedEnvSchema.safeParse(source);

  if (!result.success) {
    console.error(`Invalid environment:\n${z.prettifyError(result.error)}`);
    process.exit(1);
  }

  return result.data;
};

let cached: Env | undefined;

export const getEnv = (): Env => (cached ??= loadEnv());

export const setEnv = (env: Env | undefined): void => {
  cached = env;
};
