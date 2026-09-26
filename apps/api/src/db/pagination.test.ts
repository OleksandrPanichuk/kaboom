import { describe, expect, test } from "bun:test";
import { and, like, sql } from "drizzle-orm";

import { InvalidCursorError, type PageRequest } from "@/core/pagination";
import { getDatabase, type UserRow, usersSchema } from "@/db";

import { Keyset } from "./pagination";

const ascending = new Keyset<UserRow>({
  sort: usersSchema.createdAt,
  id: usersSchema.id,
  key: (user) => [user.createdAt, user.id],
});

const descending = new Keyset<UserRow>({
  sort: usersSchema.createdAt,
  id: usersSchema.id,
  direction: "desc",
  key: (user) => [user.createdAt, user.id],
});

const byName = new Keyset<UserRow>({
  sort: usersSchema.name,
  id: usersSchema.id,
  key: (user) => [user.name, user.id],
});

const insertAt = async (createdAt: string[]): Promise<void> => {
  for (const [index, at] of createdAt.entries()) {
    await getDatabase().execute(
      sql`insert into users (name, email, created_at) values (${`user-${index}`}, ${`user-${index}@example.com`}, ${at}::timestamptz)`,
    );
  }
};

const readPage = (
  keyset: Keyset<UserRow>,
  request: PageRequest,
  where?: ReturnType<typeof sql>,
) =>
  getDatabase()
    .select()
    .from(usersSchema)
    .where(and(where, keyset.after(request.cursor)))
    .orderBy(...keyset.orderBy())
    .limit(keyset.limit(request))
    .then((rows) => keyset.page(rows, request));

const MAX_PAGES = 50;

const walk = async (
  keyset: Keyset<UserRow>,
  limit: number,
  where?: ReturnType<typeof sql>,
): Promise<{ names: string[]; pages: number }> => {
  const names: string[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const page = await readPage(keyset, { cursor, limit }, where);

    names.push(...page.items.map((user) => user.name));
    cursor = page.nextCursor;
    pages++;
  } while (cursor !== null && pages < MAX_PAGES);

  return { names, pages };
};

const allNames = async (keyset: Keyset<UserRow>): Promise<string[]> =>
  (await readPage(keyset, { cursor: null, limit: 1_000 })).items.map(
    (user) => user.name,
  );

describe("Keyset", () => {
  test("walks every row once, in order, and ends on a null cursor", async () => {
    await insertAt([
      "2026-01-01T00:00:03Z",
      "2026-01-01T00:00:01Z",
      "2026-01-01T00:00:05Z",
      "2026-01-01T00:00:02Z",
      "2026-01-01T00:00:04Z",
    ]);

    const { names, pages } = await walk(ascending, 2);

    expect(names).toEqual(["user-1", "user-3", "user-0", "user-4", "user-2"]);
    expect(pages).toBe(3);
  });

  test("returns no cursor when the last page is exactly full", async () => {
    await insertAt(["2026-01-01T00:00:01Z", "2026-01-01T00:00:02Z"]);

    const page = await readPage(ascending, { cursor: null, limit: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  test("breaks ties on the sort column with the id", async () => {
    await insertAt(Array.from({ length: 7 }, () => "2026-01-01T00:00:00Z"));

    const { names } = await walk(ascending, 3);

    expect(names).toEqual(await allNames(ascending));
    expect(new Set(names).size).toBe(7);
  });

  test("neither skips nor repeats rows that differ below a millisecond", async () => {
    await insertAt([
      "2026-01-01T00:00:00.000900Z",
      "2026-01-01T00:00:00.000100Z",
      "2026-01-01T00:00:00.000500Z",
      "2026-01-01T00:00:00.001200Z",
    ]);

    const { names } = await walk(ascending, 1);

    expect(names).toHaveLength(4);
    expect(new Set(names).size).toBe(4);
    expect(names.at(-1)).toBe("user-3");
  });

  test("walks newest first when descending", async () => {
    await insertAt([
      "2026-01-01T00:00:01Z",
      "2026-01-01T00:00:03Z",
      "2026-01-01T00:00:02Z",
    ]);

    const { names } = await walk(descending, 2);

    expect(names).toEqual(["user-1", "user-2", "user-0"]);
  });

  test("sorts on a text column", async () => {
    await insertAt([
      "2026-01-01T00:00:01Z",
      "2026-01-01T00:00:02Z",
      "2026-01-01T00:00:03Z",
    ]);

    const { names } = await walk(byName, 2);

    expect(names).toEqual(["user-0", "user-1", "user-2"]);
  });

  test("combines with the query's own filters", async () => {
    await insertAt([
      "2026-01-01T00:00:01Z",
      "2026-01-01T00:00:02Z",
      "2026-01-01T00:00:03Z",
      "2026-01-01T00:00:04Z",
    ]);
    await getDatabase().execute(
      sql`update users set name = 'other-' || name where name in ('user-1', 'user-2')`,
    );

    const { names } = await walk(
      ascending,
      1,
      like(usersSchema.name, "user-%"),
    );

    expect(names).toEqual(["user-0", "user-3"]);
  });

  test.each([
    ["not base64 JSON", "%%%"],
    ["not a pair", Buffer.from("[1]").toString("base64url")],
    [
      "a date cursor without a date",
      Buffer.from('["x","id"]').toString("base64url"),
    ],
    [
      "an invalid date",
      Buffer.from('[{"d":"nope"},"id"]').toString("base64url"),
    ],
    [
      "a non-string id",
      Buffer.from('[{"d":"2026-01-01T00:00:00Z"},1]').toString("base64url"),
    ],
  ])("refuses a cursor that is %s", (_, cursor) => {
    expect(() => ascending.after(cursor)).toThrow(InvalidCursorError);
  });

  test("refuses a date cursor on a text keyset", async () => {
    await insertAt(["2026-01-01T00:00:01Z", "2026-01-01T00:00:02Z"]);

    const { nextCursor } = await readPage(ascending, {
      cursor: null,
      limit: 1,
    });

    expect(() => byName.after(nextCursor)).toThrow(InvalidCursorError);
  });
});
