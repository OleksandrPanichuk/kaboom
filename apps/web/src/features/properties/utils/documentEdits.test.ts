import { createEdge, createNode, type DesignOp } from "@repo/design";
import { describe, expect, test } from "bun:test";

import {
  addField,
  type CollectionNode,
  removeField,
  updateField,
} from "./documentEdits";

const orders = (): CollectionNode => {
  const node = createNode("collection", { id: "orders" });

  node.props.fields = [
    { id: "customer", name: "customer_id", type: "objectId", required: true },
    {
      id: "lines",
      name: "lines",
      type: "array",
      of: "object",
      required: false,
      fields: [{ id: "sku", name: "sku", type: "string", required: true }],
    },
  ];
  node.props.indexes = [
    {
      id: "by_sku",
      keys: [{ path: ["lines", "sku"], direction: "asc" }],
      unique: false,
    },
  ];

  return node;
};

const fieldsOf = (op: DesignOp | undefined) =>
  op?.op === "update-node" ? (op.patch.props as CollectionNode["props"]) : null;

describe("document edits", () => {
  test("add a field at the top or inside an object", () => {
    expect(fieldsOf(addField(orders(), null))?.fields.at(-1)).toMatchObject({
      name: "field_3",
      type: "string",
    });
    expect(
      fieldsOf(addField(orders(), ["lines"]))?.fields[1]?.fields?.at(-1),
    ).toMatchObject({ name: "field_2" });
  });

  test("changing a type drops what no longer fits", () => {
    const flattened = fieldsOf(
      updateField(orders(), ["lines"], { type: "string" }),
    );
    const listed = fieldsOf(
      updateField(orders(), ["customer"], { type: "array" }),
    );

    expect(flattened?.fields[1]).toEqual({
      id: "lines",
      name: "lines",
      type: "string",
      required: false,
    });
    expect(listed?.fields[0]).toMatchObject({ type: "array", of: "string" });
  });

  test("removing a field takes its references and index keys with it", () => {
    const reference = createEdge({
      id: "r",
      from: "orders",
      to: "customers",
      kind: "reference",
      reference: { fromField: ["customer"] },
    });
    const ops = removeField(orders(), ["customer"], [reference]);
    const nested = removeField(orders(), ["lines"], [reference]);

    expect(ops[0]).toEqual({ op: "remove-edge", id: "r" });
    expect(fieldsOf(nested[0])?.indexes).toEqual([]);
  });
});
