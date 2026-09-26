import z from "zod";

import {
  DESIGN_GRAPH_SCHEMA_VERSION,
  type DesignGraph,
  DesignGraphSchema,
} from "./schema";

export type GraphMigration = (
  graph: Record<string, unknown>,
) => Record<string, unknown>;

const MIGRATIONS: Readonly<Record<number, GraphMigration>> = {};

export class GraphMigrationError extends Error {
  public override readonly name = "GraphMigrationError";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const migrateGraph = (
  raw: unknown,
  migrations: Readonly<Record<number, GraphMigration>> = MIGRATIONS,
  target: number = DESIGN_GRAPH_SCHEMA_VERSION,
): DesignGraph => {
  if (!isRecord(raw) || !Number.isInteger(raw.schemaVersion)) {
    throw new GraphMigrationError("The graph has no schema version");
  }

  const from = raw.schemaVersion as number;

  if (from > target) {
    throw new GraphMigrationError(
      `The graph was written by schema version ${from}, newer than ${target}`,
    );
  }

  let graph = raw;

  for (let version = from; version < target; version++) {
    const migration = migrations[version];

    if (!migration) {
      throw new GraphMigrationError(
        `No migration from schema version ${version}`,
      );
    }

    graph = { ...migration(graph), schemaVersion: version + 1 };
  }

  const parsed = DesignGraphSchema.safeParse(graph);

  if (!parsed.success) {
    throw new GraphMigrationError(z.prettifyError(parsed.error));
  }

  return parsed.data;
};
