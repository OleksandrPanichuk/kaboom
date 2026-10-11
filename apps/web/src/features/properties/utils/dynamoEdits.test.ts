import { catalogue, createNode, type DesignOp } from "@repo/design";
import { describe, expect, test } from "bun:test";

import {
  type DynamoTableNode,
  keysInUse,
  removeItemAttribute,
  removeKeyAttribute,
  setItemKey,
  updateItemAttribute,
} from "./dynamoEdits";

const shop = (): DynamoTableNode => {
  const node = createNode("dynamo-table", { id: "shop" });

  node.props.keySchema = {
    attributes: [
      { id: "PK", name: "PK", type: "S" },
      { id: "SK", name: "SK", type: "S" },
      { id: "GSI1PK", name: "GSI1PK", type: "S" },
      { id: "spare", name: "spare", type: "S" },
    ],
    partitionKey: "PK",
    sortKey: "SK",
  };
  node.props.indexes = [
    {
      id: "gsi1",
      name: "GSI1",
      kind: "global",
      partitionKey: "GSI1PK",
      sortKey: "SK",
      projection: "all",
    },
  ];
  node.props.items = [
    {
      id: "order",
      name: "Order",
      attributes: [
        { id: "customer", name: "customerId", type: "S" },
        { id: "status", name: "status", type: "S" },
      ],
      keys: {
        PK: "CUSTOMER#{customerId}",
        SK: "ORDER",
        GSI1PK: "STATUS#{status}",
      },
    },
  ];

  return node;
};

const propsOf = (table: DynamoTableNode, op: DesignOp) => ({
  ...table.props,
  ...(op.op === "update-node"
    ? (op.patch.props as Partial<DynamoTableNode["props"]>)
    : {}),
});

const valid = (props: DynamoTableNode["props"]) =>
  catalogue["dynamo-table"].props.safeParse(props).success;

describe("DynamoDB edits", () => {
  test("removing a key attribute removes the indexes and item keys that use it", () => {
    const table = shop();
    const props = propsOf(table, removeKeyAttribute(table, "GSI1PK"));

    expect(props.indexes).toEqual([]);
    expect(props.items[0]!.keys).toEqual({
      PK: "CUSTOMER#{customerId}",
      SK: "ORDER",
    });
    expect(valid(props)).toBe(true);
  });

  test("removing the partition key also drops the sort key", () => {
    const table = shop();
    const { keySchema } = propsOf(table, removeKeyAttribute(table, "PK"));

    expect(keySchema).toMatchObject({ partitionKey: null, sortKey: null });
  });

  test("renaming an attribute rewrites the templates that use it", () => {
    const table = shop();
    const props = propsOf(
      table,
      updateItemAttribute(table, "order", "customer", { name: "buyerId" }),
    );

    expect(props.items[0]!.keys.PK).toBe("CUSTOMER#{buyerId}");
    expect(valid(props)).toBe(true);
  });

  test("removing an attribute removes the keys built from it", () => {
    const table = shop();
    const props = propsOf(table, removeItemAttribute(table, "order", "status"));

    expect(Object.keys(props.items[0]!.keys)).toEqual(["PK", "SK"]);
    expect(valid(props)).toBe(true);
  });

  test("an empty template takes the item out of that key", () => {
    const table = shop();
    const props = propsOf(table, setItemKey(table, "order", "GSI1PK", ""));

    expect(props.items[0]!.keys.GSI1PK).toBeUndefined();
  });

  test("clearing shards drops the field", () => {
    const table = shop();
    const sharded = propsOf(
      table,
      updateItemAttribute(table, "order", "status", { shards: 4 }),
    );
    const cleared = propsOf(
      { ...table, props: sharded },
      updateItemAttribute({ ...table, props: sharded }, "order", "status", {
        shards: undefined,
      }),
    );

    expect(sharded.items[0]!.attributes[1]).toMatchObject({ shards: 4 });
    expect("shards" in cleared.items[0]!.attributes[1]!).toBe(false);
  });

  test("lists only the key attributes the table or an index is keyed by", () => {
    expect(keysInUse(shop()).map((attribute) => attribute.name)).toEqual([
      "PK",
      "SK",
      "GSI1PK",
    ]);
  });
});
