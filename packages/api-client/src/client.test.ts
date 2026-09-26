import { describe, expect, mock, test } from "bun:test";

import type { ApiProxy } from "./client";

void mock.module("./generated/routes", () => ({
  routePaths: {
    "api.items.get": "/api/items",
    "api.search.post": "/api/search",
    "api.ping.get": "/api/ping",
  },
}));

const { createApiClient } = await import("./client");

interface Item {
  id: string;
}

interface TestRoutes {
  api: {
    items: {
      get: {
        response: { items: Item[]; nextCursor: string | null };
        query: { cursor?: string; limit?: number; tags?: string[] };
      };
    };
    search: {
      post: {
        response: Item[];
        body: { text: string };
        query: { track: "design" | "devops" };
      };
    };
    ping: {
      get: { response: string };
    };
  };
}

const ITEMS = ["a", "b", "c"].map((id) => ({ id }));

const fakeServer = (seen: string[]) =>
  ((input: string | URL | Request) => {
    const url = new URL(String(input));

    seen.push(`${url.pathname}${url.search}`);

    const limit = Number(url.searchParams.get("limit") ?? 20);
    const start = Number(url.searchParams.get("cursor") ?? 0);
    const items = ITEMS.slice(start, start + limit);
    const next = start + limit < ITEMS.length ? String(start + limit) : null;

    return Promise.resolve(Response.json({ items, nextCursor: next }));
  }) as typeof fetch;

const client = (seen: string[]) =>
  createApiClient({
    url: "http://localhost",
    fetch: fakeServer(seen),
  }) as unknown as ApiProxy<TestRoutes>;

describe("api client query", () => {
  test("fetches two pages by passing the cursor back", async () => {
    const seen: string[] = [];
    const api = client(seen);

    const first = await api.api.items.get({ query: { limit: 2 } });
    const second = await api.api.items.get({
      query: { limit: 2, cursor: first.data!.nextCursor! },
    });

    expect(first.data!.items).toEqual([{ id: "a" }, { id: "b" }]);
    expect(second.data).toEqual({ items: [{ id: "c" }], nextCursor: null });
    expect(seen).toEqual(["/api/items?limit=2", "/api/items?limit=2&cursor=2"]);
  });

  test("repeats array values and drops undefined ones", async () => {
    const seen: string[] = [];

    await client(seen).api.items.get({
      query: { tags: ["x", "y z"], cursor: undefined },
    });

    expect(seen).toEqual(["/api/items?tags=x&tags=y+z"]);
  });

  test("sends no query string without a query", async () => {
    const seen: string[] = [];

    await client(seen).api.items.get();
    await client(seen).api.ping.get();

    expect(seen).toEqual(["/api/items", "/api/ping"]);
  });

  test("passes the query beside a body", async () => {
    const seen: string[] = [];

    await client(seen).api.search.post(
      { text: "cache" },
      { query: { track: "design" } },
    );

    expect(seen).toEqual(["/api/search?track=design"]);
  });

  test("types the query from the route", () => {
    const api = client([]);

    const typeChecks = () => {
      // @ts-expect-error a required query parameter is missing
      void api.api.search.post({ text: "cache" });
      // @ts-expect-error limit is a number
      void api.api.items.get({ query: { limit: "2" } });
      // @ts-expect-error the route takes no query
      void api.api.ping.get({ query: { limit: 2 } });
    };

    expect(typeChecks).toBeFunction();
  });
});
