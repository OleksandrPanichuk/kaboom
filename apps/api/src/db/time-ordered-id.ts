import { sql } from "drizzle-orm";
import { uuid } from "drizzle-orm/pg-core";

export const timeOrderedId = () =>
  uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`);
