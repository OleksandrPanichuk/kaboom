import { resolve } from "node:path";

import { SQL } from "bun";
import { migrate } from "drizzle-orm/bun-sql/migrator";

import { createDatabase } from "@/db/client";

if (Bun.env.NODE_ENV !== "test" || Bun.env.E2E_CONTROL !== "true") {
  console.error(
    "The end-to-end server runs only with NODE_ENV=test and E2E_CONTROL=true.",
  );
  process.exit(1);
}

const url = new URL(Bun.env.DATABASE_URL ?? "");
const name = url.pathname.slice(1);
const admin = new SQL({ url: new URL("/postgres", url).toString() });

try {
  await admin.unsafe(`drop database if exists "${name}" with (force)`);
  await admin.unsafe(`create database "${name}"`);
} finally {
  await admin.close();
}

const db = createDatabase({ url: url.toString() });

try {
  await migrate(db, {
    migrationsFolder: resolve(import.meta.dir, "..", "drizzle"),
  });
} finally {
  await db.close();
}

await import("../src/main");
