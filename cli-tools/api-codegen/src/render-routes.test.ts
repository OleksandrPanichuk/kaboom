import { describe, expect, test } from "bun:test";

import { renderRoutes } from "./render-routes";

const response = {
  "200": {
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["revision"],
          properties: {
            revision: {
              anyOf: [
                { type: "string", format: "integer", default: 0 },
                { type: "integer" },
              ],
            },
          },
        },
      },
    },
  },
};

const paths = {
  "/api/problems": {
    get: {
      parameters: [
        {
          name: "cursor",
          in: "query",
          required: false,
          schema: { type: "string", minLength: 1, maxLength: 512 },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: {
            anyOf: [
              { type: "string", format: "integer", default: 0 },
              { type: "integer", minimum: 1, maximum: 100 },
            ],
          },
        },
        {
          name: "track",
          in: "query",
          required: true,
          schema: { type: "string", enum: ["design", "devops"] },
        },
        {
          name: "tags",
          in: "query",
          required: false,
          schema: { type: "array", items: { type: "string" } },
        },
      ],
      responses: response,
    },
  },
  "/api/problems/{slug}/events": {
    get: {
      parameters: [{ name: "slug", in: "path", required: true }],
      responses: {
        "200": {
          content: { "text/event-stream": { schema: { type: "string" } } },
        },
      },
    },
  },
  "/api/problems/{slug}": {
    get: {
      parameters: [{ name: "slug", in: "path", required: true }],
      responses: response,
    },
  },
};

describe("renderRoutes", () => {
  const rendered = renderRoutes(paths);

  test("renders query parameters as a typed query member", () => {
    expect(rendered).toContain(
      [
        "        query: {",
        "          cursor?: string;",
        "          limit?: number;",
        '          track: "design" | "devops";',
        "          tags?: Array<string>;",
        "        };",
      ].join("\n"),
    );
  });

  test("renders no query member for a route without query parameters", () => {
    const slugRoute = rendered.slice(rendered.indexOf("(slug:"));

    expect(slugRoute).not.toContain("query:");
  });

  test("leaves event streams out, since the client reads whole bodies", () => {
    expect(rendered).not.toContain("events:");
    expect(rendered).not.toContain("/events");
  });

  test("types a coerced integer in a response as a number", () => {
    expect(rendered).toContain("revision: number;");
    expect(rendered).not.toContain("revision: string | number;");
  });
});
