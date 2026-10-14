import { loadEnv, setEnv } from "@/configs";
import { make } from "@/core/registry";
import { closeDatabase } from "@/db";
import { closeInfrastructure } from "@/infrastructure";
import { designsModule } from "@/modules/designs";
import {
  SplitAttemptSchemasUseCase,
  submissionsModule,
} from "@/modules/submissions";

const flags = Bun.argv.slice(2);
const apply = flags.includes("--apply");

if (flags.some((flag) => flag !== "--apply")) {
  console.error("Usage: bun run attempts:split-schemas [--apply]");
  process.exit(1);
}

setEnv(loadEnv());
designsModule.register();
submissionsModule.register();

try {
  const results = await make(SplitAttemptSchemasUseCase).execute({ apply });

  for (const result of results) {
    if (result.status === "skipped") continue;

    const schemas = result.schemas
      .map((schema) => `"${schema.name}" (${schema.tables} tables)`)
      .join(", ");

    console.log(`${result.status}  attempt ${result.attemptId}  ${schemas}`);
  }

  const count = (status: string) =>
    results.filter((result) => result.status === status).length;

  console.log(
    apply
      ? `Split ${count("split")} of ${results.length} attempts.`
      : `Would split ${count("would-split")} of ${results.length} attempts. Run with --apply to do it.`,
  );
} finally {
  await closeDatabase();
  await closeInfrastructure();
}
