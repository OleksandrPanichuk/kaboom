import { resolve } from "node:path";

import { SQL } from "bun";
import { afterAll, afterEach, beforeAll } from "bun:test";
import { getTableName, is, Table } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sql/migrator";

import type { MemoryCaptchaVerifier } from "@/adapters/captcha/memory.captcha-verifier";
import type { MemoryErrorReporter } from "@/adapters/error-reporting/memory.error-reporter";
import type { MemoryMailer } from "@/adapters/mail/memory.mailer";
import type { MemoryMetrics } from "@/adapters/metrics/memory.metrics";
import type { MemoryRateLimitStore } from "@/adapters/rate-limit/memory.rate-limit-store";
import type { MemoryRealtime } from "@/adapters/realtime/memory.realtime";
import { loadEnv, setEnv } from "@/configs";
import { closeModules, createApp, startModules } from "@/core/app";
import { make } from "@/core/registry";
import { createDatabase, getDatabase } from "@/db";
import * as schema from "@/db/schema";
import { closeInfrastructure } from "@/infrastructure";
import { Mailer } from "@/modules/notifications/ports";
import { CaptchaVerifier } from "@/platform/captcha";
import { ErrorReporter } from "@/platform/error-reporting";
import { Metrics } from "@/platform/metrics";
import { RateLimitStore } from "@/platform/rate-limit";
import { Realtime } from "@/platform/realtime";

import { setApp } from "./app";

const API_ROOT = resolve(import.meta.dir, "../..");
const MIGRATIONS = resolve(API_ROOT, "drizzle");

const DUPLICATE_DATABASE = "42P04";
const CONNECTION_REFUSED = "ERR_POSTGRES_CONNECTION_REFUSED";

const ensureDatabase = async (url: string): Promise<void> => {
  const target = new URL(url);
  const name = target.pathname.slice(1);
  const admin = new SQL({ url: new URL("/postgres", target).toString() });

  try {
    await admin.unsafe(`create database "${name}"`);
  } catch (error) {
    const { errno, code } = error as { errno?: string; code?: string };

    if (code === CONNECTION_REFUSED) {
      throw new Error(
        `Postgres is not reachable at ${target.host}. The suite needs it running: \`make up-db\`.`,
        { cause: error },
      );
    }

    if (errno !== DUPLICATE_DATABASE) throw error;
  } finally {
    await admin.close();
  }
};

const tables = Object.values(schema)
  .filter((value) => is(value, Table))
  .map((table) => `"${getTableName(table as Table)}"`);

beforeAll(async () => {
  const env = loadEnv();

  setEnv(env);

  await ensureDatabase(env.DATABASE_URL);

  const migrator = createDatabase({ url: env.DATABASE_URL });

  try {
    await migrate(migrator, { migrationsFolder: MIGRATIONS });
  } finally {
    await migrator.close();
  }

  setApp(createApp());

  await startModules();
});

afterEach(async () => {
  await getDatabase().execute(
    `truncate table ${tables.join(", ")} restart identity cascade`,
  );

  (make(Mailer) as MemoryMailer).clear();
  (make(RateLimitStore) as MemoryRateLimitStore).clear();
  (make(CaptchaVerifier) as MemoryCaptchaVerifier).clear();
  (make(ErrorReporter) as MemoryErrorReporter).clear();
  (make(Metrics) as MemoryMetrics).clear();
  (make(Realtime) as MemoryRealtime).clear();
});

afterAll(async () => {
  await closeModules();
  await closeInfrastructure();
});
