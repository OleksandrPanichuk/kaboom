import { config } from "@repo/eslint-config/base";

const RUNTIME_ONLY = [
  "elysia",
  "elysia/*",
  "drizzle-orm",
  "drizzle-orm/*",
  "ioredis",
  "react",
  "react/*",
  "react-dom",
  "react-dom/*",
  "@repo/api",
  "@repo/api-client",
  "@/*",
  "bun",
];

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: RUNTIME_ONLY,
              message:
                "@repo/design is shared by the API and the web app: it may import zod and itself, nothing that belongs to one runtime.",
            },
          ],
        },
      ],
    },
  },
];
