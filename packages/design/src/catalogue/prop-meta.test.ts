import { describe, expect, test } from "bun:test";
import z from "zod";

import { catalogue, NODE_KINDS } from "./catalogue";
import { describeProps, PROP_UNITS } from "./prop-meta";

describe("prop metadata", () => {
  test.each(NODE_KINDS)("labels every prop of %s", (kind) => {
    const fields = describeProps(catalogue[kind].props);

    expect(fields.map((field) => field.key)).toEqual(
      Object.keys(catalogue[kind].props.shape),
    );

    for (const { meta } of fields) {
      expect(meta.title.length).toBeGreaterThan(0);

      if (meta.unit !== undefined) expect(PROP_UNITS).toContain(meta.unit);
    }
  });

  test.each(NODE_KINDS)(
    "converts %s to JSON Schema with its metadata",
    (kind) => {
      const schema = z.toJSONSchema(catalogue[kind].props, { io: "input" }) as {
        properties: Record<string, { title?: string }>;
      };

      for (const property of Object.values(schema.properties)) {
        expect(typeof property.title).toBe("string");
      }
    },
  );

  test("carries the unit and the advanced flag into JSON Schema", () => {
    const schema = z.toJSONSchema(catalogue["sql-database"].props, {
      io: "input",
    }) as { properties: Record<string, Record<string, unknown>> };

    expect(schema.properties.writeCapacityRps).toMatchObject({
      title: "Write capacity",
      unit: "req/s",
      default: 1_000,
    });
    expect(schema.properties.recordSizeKb).toMatchObject({
      unit: "KB",
      advanced: true,
    });
  });
});
