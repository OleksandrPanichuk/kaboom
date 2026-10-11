import { describe, expect, test } from "bun:test";

import {
  defaultOf,
  humanize,
  optionIndex,
  shapeOf,
  switchOption,
} from "./schemaForm";

const load = {
  type: "object",
  title: "Load",
  properties: {
    kind: { type: "string", const: "load", default: "load" },
    id: { type: "string" },
    durationSeconds: { type: "integer", minimum: 10, default: 600 },
    expect: {
      type: "object",
      properties: {
        forbid: {
          type: "array",
          items: { type: "string", enum: ["a"] },
          default: [],
        },
      },
    },
  },
  required: ["id", "expect"],
};
const network = {
  type: "object",
  properties: {
    kind: { type: "string", const: "network" },
    id: { type: "string" },
    expect: { type: "object", properties: {} },
  },
  required: ["kind", "id", "expect"],
};

describe("a schema form", () => {
  test("reads a union by the field every option fixes", () => {
    expect(shapeOf({ anyOf: [network, load] })).toMatchObject({
      kind: "union",
      discriminator: "kind",
    });
  });

  test("reads a value or null as nullable", () => {
    expect(shapeOf({ anyOf: [{ type: "integer" }, { type: "null" }] })).toEqual(
      {
        kind: "nullable",
        inner: { type: "integer" },
      },
    );
  });

  test("builds a value from what is required and fixed", () => {
    expect(defaultOf(network)).toEqual({ kind: "network", id: "", expect: {} });
    expect(defaultOf(load)).toEqual({
      kind: "load",
      id: "",
      durationSeconds: 600,
      expect: { forbid: [] },
    });
    expect(defaultOf({ type: "number", minimum: 0, examples: [2] })).toBe(2);
  });

  test("keeps the shared fields when the kind changes", () => {
    expect(
      switchOption({ kind: "load", id: "peak", durationSeconds: 60 }, network),
    ).toEqual({
      kind: "network",
      id: "peak",
      expect: {},
    });
  });

  test("finds a value's option by its tag, or the one that tags itself by default", () => {
    expect(optionIndex([network, load], "kind", { kind: "network" })).toBe(0);
    expect(optionIndex([network, load], "kind", { id: "x" })).toBe(1);
  });

  test("turns keys into labels", () => {
    expect(humanize("durationSeconds")).toBe("Duration seconds");
    expect(humanize("key-value")).toBe("Key value");
  });
});
