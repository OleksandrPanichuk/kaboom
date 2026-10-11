import { describe, expect, test } from "bun:test";

import { summaryOf } from "./itemSummary";

const fault = {
  oneOf: [
    {
      type: "object",
      title: "Node down",
      properties: {
        kind: { type: "string", const: "node-down" },
        select: {
          type: "object",
          properties: {
            nodeKind: { type: "string", enum: ["service", "cache"] },
            role: { type: "string", enum: ["any", "primary"] },
          },
        },
        at: { type: "number", title: "Starts at (s)" },
        until: { type: "number", title: "Ends at (s)" },
      },
    },
  ],
};

const drill = {
  anyOf: [
    {
      type: "object",
      title: "Load",
      properties: {
        kind: { type: "string", const: "load" },
        id: { type: "string" },
        title: { type: "string" },
        visibility: { type: "string", enum: ["public", "hidden"] },
        durationSeconds: { type: "integer", title: "Duration (s)" },
        traffic: {
          type: "array",
          items: { type: "object", title: "Traffic change" },
        },
        faults: { type: "array", items: fault },
      },
    },
  ],
};

describe("an item's summary", () => {
  test("reads a drill as its kind, title, id and the facts that tell it apart", () => {
    expect(
      summaryOf(drill, {
        kind: "load",
        id: "normal-day",
        title: "A normal day",
        visibility: "public",
        durationSeconds: 600,
        traffic: [{ at: 4, multiplier: 3 }],
        faults: [{}, {}],
      }),
    ).toEqual({
      kind: "Load",
      title: "A normal day",
      id: "normal-day",
      aside: null,
      details: ["Public", "Duration 10:00", "1 traffic change", "2 faults"],
    });
  });

  test("reads a fault through its node and its window", () => {
    expect(
      summaryOf(fault, {
        kind: "node-down",
        select: { nodeKind: "service", role: "primary" },
        at: 120,
        until: 240,
      }),
    ).toEqual({
      kind: "Node down",
      title: null,
      id: null,
      aside: null,
      details: ["Starts at 2:00", "Ends at 4:00", "Service", "Primary"],
    });
  });

  test("puts a weight beside the title", () => {
    expect(
      summaryOf(
        {
          type: "object",
          properties: {
            key: { type: "string" },
            title: { type: "string" },
            weight: { type: "integer" },
          },
        },
        { key: "serves", title: "Serves a normal day", weight: 60 },
      ),
    ).toEqual({
      kind: null,
      title: "Serves a normal day",
      id: "serves",
      aside: "60 pts",
      details: [],
    });
  });
});
