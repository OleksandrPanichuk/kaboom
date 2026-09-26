import { type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
  InvalidCursorError,
  type Page,
  type PageRequest,
} from "@/core/pagination";

type SortValue = Date | string | number;

export interface KeysetOptions<Row> {
  sort: PgColumn;
  id: PgColumn;
  direction?: "asc" | "desc";
  key: (row: Row) => readonly [SortValue, string];
}

type EncodedSortValue = { d: string } | string | number;

const encode = ([sort, id]: readonly [SortValue, string]): string => {
  const value: EncodedSortValue =
    sort instanceof Date ? { d: sort.toISOString() } : sort;

  return Buffer.from(JSON.stringify([value, id])).toString("base64url");
};

const parse = (cursor: string): unknown => {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new InvalidCursorError();
  }
};

export class Keyset<Row> {
  private readonly sort: PgColumn;
  private readonly id: PgColumn;
  private readonly direction: "asc" | "desc";
  private readonly key: KeysetOptions<Row>["key"];

  constructor({ sort, id, direction = "asc", key }: KeysetOptions<Row>) {
    this.sort = sort;
    this.id = id;
    this.direction = direction;
    this.key = key;
  }

  private get isDate(): boolean {
    return this.sort.dataType === "date";
  }

  private get sortExpression(): SQL {
    return this.isDate
      ? sql`date_trunc('milliseconds', ${this.sort})`
      : sql`${this.sort}`;
  }

  private decode(cursor: string): readonly [SortValue, string] {
    const decoded = parse(cursor);

    if (!Array.isArray(decoded) || decoded.length !== 2) {
      throw new InvalidCursorError();
    }

    const [value, id] = decoded as [unknown, unknown];

    if (typeof id !== "string") throw new InvalidCursorError();

    if (this.isDate) {
      const iso = (value as { d?: unknown } | null)?.d;
      const date = typeof iso === "string" ? new Date(iso) : null;

      if (!date || Number.isNaN(date.getTime())) {
        throw new InvalidCursorError();
      }

      return [date, id];
    }

    if (typeof value !== "string" && typeof value !== "number") {
      throw new InvalidCursorError();
    }

    return [value, id];
  }

  public after(cursor: string | null): SQL | undefined {
    if (cursor === null) return undefined;

    const [value, id] = this.decode(cursor);
    const op = sql.raw(this.direction === "asc" ? ">" : "<");
    const sortValue = sql.param(value, this.sort);
    const idValue = sql.param(id, this.id);

    return sql`(${this.sortExpression} ${op} ${sortValue} or (${this.sortExpression} = ${sortValue} and ${this.id} ${op} ${idValue}))`;
  }

  public orderBy(): SQL[] {
    const direction = sql.raw(this.direction);

    return [
      sql`${this.sortExpression} ${direction}`,
      sql`${this.id} ${direction}`,
    ];
  }

  public limit(request: PageRequest): number {
    return request.limit + 1;
  }

  public page(rows: Row[], request: PageRequest): Page<Row> {
    const items = rows.slice(0, request.limit);
    const last = items.at(-1);

    return {
      items,
      nextCursor:
        rows.length > request.limit && last !== undefined
          ? encode(this.key(last))
          : null,
    };
  }
}
