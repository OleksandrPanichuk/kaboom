import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

import {
  DEFAULT_PAGE_LIMIT,
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";
import { getDatabase, usersSchema } from "@/db";
import {
  PostgresUsersRepository,
  UserEntity,
  UserModel,
} from "@/modules/users";
import { errorPlugin } from "@/plugins";

interface UserPage {
  items: UserModel[];
  nextCursor: string | null;
}

const users = new PostgresUsersRepository();

const probe = new Elysia().use(errorPlugin).get(
  "/probe/users",
  ...defineRoute({
    query: PageQuery,
    response: PageModel(UserModel),

    action: ({ query }) => users.list(toPageRequest(query)),

    postAction: ({ output }) => mapPage(output, UserEntity.normalize),
  }),
);

const list = (search = "") =>
  probe.handle(new Request(`http://localhost/probe/users${search}`));

const seed = (count: number) =>
  getDatabase()
    .insert(usersSchema)
    .values(
      Array.from({ length: count }, (_, index) => ({
        name: `user-${index}`,
        email: `user-${index}@example.com`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
      })),
    );

describe("pagination", () => {
  test("fetches the next page with the cursor from the previous one", async () => {
    await seed(3);

    const first = await list("?limit=2");
    const firstBody = (await first.json()) as UserPage;

    expect(first.status).toBe(200);
    expect(firstBody.items.map((user) => user.name)).toEqual([
      "user-0",
      "user-1",
    ]);
    expect(typeof firstBody.nextCursor).toBe("string");

    const second = await list(
      `?limit=2&cursor=${encodeURIComponent(firstBody.nextCursor!)}`,
    );
    const secondBody = (await second.json()) as UserPage;

    expect(secondBody.items.map((user) => user.name)).toEqual(["user-2"]);
    expect(secondBody.nextCursor).toBeNull();
  });

  test(`returns ${DEFAULT_PAGE_LIMIT} items when no limit is given`, async () => {
    await seed(DEFAULT_PAGE_LIMIT + 1);

    const body = (await (await list()).json()) as { items: unknown[] };

    expect(body.items).toHaveLength(DEFAULT_PAGE_LIMIT);
  });

  test.each(["0", "101", "abc", "1.5"])(
    "refuses limit=%s as a validation error",
    async (limit) => {
      const response = await list(`?limit=${limit}`);

      expect(response.status).toBe(422);
    },
  );

  test("answers 400 INVALID_CURSOR for a cursor it did not issue", async () => {
    const response = await list("?cursor=not-a-cursor");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_CURSOR" });
  });
});
