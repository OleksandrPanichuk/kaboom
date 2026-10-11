export const ENGINES = [
  "postgres",
  "mysql",
  "sqlite",
  "mongodb",
  "dynamodb",
] as const;

export type Engine = (typeof ENGINES)[number];

export type EngineFamily = "sql" | "document" | "key-value";

export const ENGINE_LABELS: Readonly<Record<Engine, string>> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  mongodb: "MongoDB",
  dynamodb: "DynamoDB",
};

export const ENGINE_FAMILIES: Readonly<Record<Engine, EngineFamily>> = {
  postgres: "sql",
  mysql: "sql",
  sqlite: "sql",
  mongodb: "document",
  dynamodb: "key-value",
};

export const DEFAULT_ENGINE: Engine = "postgres";
