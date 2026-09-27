import { describe, expect, test } from "bun:test";
import z from "zod";

import { catalogue, NODE_KINDS, type NodeKind } from "./catalogue";
import { describeProps, PROP_UNITS, propControl } from "./prop-meta";

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

describe("propControl", () => {
  const fields = (kind: NodeKind) =>
    Object.fromEntries(
      describeProps(catalogue[kind].props).map((field) => [
        field.key,
        propControl(field.schema),
      ]),
    );

  test("describes numbers with their bounds and whether they are whole", () => {
    expect(fields("service").replicas).toEqual({
      type: "number",
      min: 1,
      max: 10_000,
      integer: true,
    });
    expect(fields("service").baseLatencyMs).toMatchObject({
      type: "number",
      integer: false,
    });
  });

  test("describes toggles, choices and text", () => {
    expect(fields("service").stateless).toEqual({ type: "boolean" });
    expect(fields("sql-database").failover).toEqual({
      type: "choice",
      options: ["none", "manual", "automatic"],
    });
    expect(fields("sql-database").shardKey).toEqual({
      type: "text",
      maxLength: 80,
    });
  });

  test("describes a nested object as a group of its own fields", () => {
    const autoscale = fields("service").autoscale;

    expect(autoscale?.type).toBe("group");
    expect(
      autoscale?.type === "group"
        ? autoscale.fields.map((field) => field.key)
        : [],
    ).toEqual(["enabled", "min", "max", "targetUtilisation"]);
  });

  test("every prop of every kind has a control", () => {
    for (const kind of NODE_KINDS) {
      for (const field of describeProps(catalogue[kind].props)) {
        expect(() => propControl(field.schema)).not.toThrow();
      }
    }
  });
});
