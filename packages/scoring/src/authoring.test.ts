import { describe, expect, test } from "bun:test";

import { AUTHORING_SECTIONS, authoringSchema } from "./authoring";

type Node = Record<string, unknown>;

const options = (schema: Node): Node[] =>
  ((schema.anyOf ?? schema.oneOf) as Node[] | undefined) ?? [];

const find = (schema: unknown, key: string, value: unknown): Node[] => {
  if (Array.isArray(schema))
    return schema.flatMap((item) => find(item, key, value));
  if (schema === null || typeof schema !== "object") return [];

  const node = schema as Node;
  const here = node[key] === value ? [node] : [];

  return [
    ...here,
    ...Object.values(node).flatMap((item) => find(item, key, value)),
  ];
};

describe("the authoring schemas", () => {
  test("describe every section", () => {
    for (const section of AUTHORING_SECTIONS) {
      expect(Object.keys(authoringSchema(section)).length).toBeGreaterThan(0);
    }
  });

  test("name each kind of drill, discriminated by its kind", () => {
    const drill = (authoringSchema("drills").items ?? {}) as Node;
    const kinds = options(drill).map((option) => {
      const properties = option.properties as Record<string, Node>;

      return [properties.kind?.const, option.title];
    });

    expect(kinds).toEqual([
      ["pipeline", "Pipeline"],
      ["network", "Network"],
      ["schema", "SQL schema"],
      ["documents", "Documents"],
      ["key-value", "Key-value"],
      ["load", "Load"],
    ]);
  });

  test("mark the fields that name something the problem has", () => {
    expect(
      find(authoringSchema("rubric"), "ref", "drill").length,
    ).toBeGreaterThan(0);
    expect(
      find(authoringSchema("drills"), "ref", "table").length,
    ).toBeGreaterThan(0);
    expect(
      find(authoringSchema("drills"), "ref", "collection").length,
    ).toBeGreaterThan(0);
    expect(
      find(authoringSchema("drills"), "ref", "item").length,
    ).toBeGreaterThan(0);
    expect(find(authoringSchema("interview"), "ref", "drill")).toHaveLength(1);
  });

  test("leave out the JSON Schema dialect, which a form does not need", () => {
    expect(authoringSchema("chaos").$schema).toBeUndefined();
  });
});
