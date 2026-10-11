import { describe, expect, test } from "bun:test";

import { catalogue } from "../../catalogue";
import { toCloudFormation } from "../../data-model/cloudformation";
import {
  attribute,
  dynamoTable,
  gsi,
  itemType,
  key,
} from "../../data-model/fixtures";
import type { DynamoTableNode } from "../../data-model/key-value";
import { createGroup, type DesignNode, emptyGraph } from "../../graph";
import { applyOps } from "../../ops";
import { evaluateKeyValue } from "./evaluate-key-value";
import { KeyValueRequirementsSchema } from "./requirements";

const kv = createGroup({
  id: "kv",
  kind: "database",
  label: "Shop",
  engine: "dynamodb",
});

const graphOf = (...nodes: DesignNode[]) => ({
  ...emptyGraph(),
  groups: [kv],
  nodes,
});

const customer = (keys = true) =>
  itemType(
    "Customer",
    [attribute("customerId"), attribute("email")],
    keys ? { PK: "CUSTOMER#{customerId}", SK: "PROFILE" } : {},
  );

const order = (
  keys: Record<string, string> = {
    PK: "CUSTOMER#{customerId}",
    SK: "ORDER#{createdAt}",
    GSI1PK: "STATUS#{status}",
    GSI1SK: "{createdAt}",
  },
  extra: Array<ReturnType<typeof attribute>> = [],
) =>
  itemType(
    "Order",
    [
      attribute("customerId"),
      attribute("orderId"),
      attribute("status"),
      attribute("createdAt"),
      attribute("total", "N"),
      ...extra,
    ],
    keys,
  );

const shop = (
  overrides: Partial<Parameters<typeof dynamoTable>[1]> = {},
): DynamoTableNode =>
  dynamoTable("shop", {
    attributes: [key("PK"), key("SK"), key("GSI1PK"), key("GSI1SK")],
    indexes: [gsi("GSI1", "GSI1PK", "GSI1SK")],
    items: [customer(), order()],
    ...overrides,
  });

const evaluate = (graph: ReturnType<typeof graphOf>, requirements: unknown) =>
  evaluateKeyValue(graph, KeyValueRequirementsSchema.parse(requirements));

const pattern = (fields: Record<string, unknown>) => ({
  patterns: [{ id: "p", title: "The pattern", ...fields }],
});

const only = (result: ReturnType<typeof evaluate>) => result.checks[0]!;

describe("access patterns", () => {
  test("reads a customer with their orders in one Query on the table", () => {
    const check = only(
      evaluate(
        graphOf(shop()),
        pattern({ items: ["Customer", "Order"], equal: ["customerId"] }),
      ),
    );

    expect(check).toMatchObject({
      passed: true,
      actual: "a Query on the table",
    });
  });

  test("reads items together only when they share a partition", () => {
    const apart = shop({
      items: [
        customer(),
        order({ PK: "ORDER#{customerId}", SK: "{createdAt}" }),
      ],
    });
    const check = only(
      evaluate(
        graphOf(apart),
        pattern({ items: ["Customer", "Order"], equal: ["customerId"] }),
      ),
    );

    expect(check).toMatchObject({ passed: false, finding: "needs-scan" });
  });

  test("bounds a range by the attribute that comes next in the sort key", () => {
    const ranged = pattern({
      items: ["Order"],
      equal: ["customerId"],
      range: "createdAt",
    });

    expect(only(evaluate(graphOf(shop()), ranged)).passed).toBe(true);

    const backwards = shop({
      items: [
        customer(),
        order({ PK: "CUSTOMER#{customerId}", SK: "{orderId}#{createdAt}" }),
      ],
    });

    expect(only(evaluate(graphOf(backwards), ranged))).toMatchObject({
      passed: false,
      finding: "needs-scan",
    });
  });

  test("uses the sort key's leading attributes for equality", () => {
    const nested = shop({
      items: [
        customer(),
        order({
          PK: "CUSTOMER#{customerId}",
          SK: "ORDER#{status}#{createdAt}",
        }),
      ],
    });
    const check = only(
      evaluate(
        graphOf(nested),
        pattern({
          items: ["Order"],
          equal: ["customerId", "status"],
          range: "createdAt",
        }),
      ),
    );

    expect(check.passed).toBe(true);
  });

  test("finds orders by status through a global index, and scans without one", () => {
    const byStatus = pattern({
      items: ["Order"],
      equal: ["status"],
      range: "createdAt",
    });

    expect(only(evaluate(graphOf(shop()), byStatus))).toMatchObject({
      passed: true,
      actual: "a Query on GSI1",
    });
    expect(
      only(evaluate(graphOf(shop({ indexes: [] })), byStatus)),
    ).toMatchObject({
      passed: false,
      finding: "needs-scan",
      actual: "a Scan",
    });
  });

  test("leaves an item without the index's keys out of the index", () => {
    const unindexed = shop({
      items: [
        customer(),
        order({ PK: "CUSTOMER#{customerId}", SK: "ORDER#{createdAt}" }),
      ],
    });

    expect(
      only(
        evaluate(
          graphOf(unindexed),
          pattern({ items: ["Order"], equal: ["status"] }),
        ),
      ).passed,
    ).toBe(false);
  });

  test("needs a global index to project what a pattern returns", () => {
    const byStatus = pattern({
      items: ["Order"],
      equal: ["status"],
      returns: ["total"],
    });
    const keysOnly = shop({
      indexes: [gsi("GSI1", "GSI1PK", "GSI1SK", { projection: "keys-only" })],
    });
    const included = shop({
      indexes: [
        gsi("GSI1", "GSI1PK", "GSI1SK", {
          projection: "include",
          include: ["total"],
        }),
      ],
    });

    expect(only(evaluate(graphOf(keysOnly), byStatus))).toMatchObject({
      passed: false,
      finding: "projection-missing",
    });
    expect(only(evaluate(graphOf(included), byStatus)).passed).toBe(true);
  });

  test("counts an attribute named in a key as projected", () => {
    const keysOnly = shop({
      indexes: [gsi("GSI1", "GSI1PK", "GSI1SK", { projection: "keys-only" })],
    });

    expect(
      only(
        evaluate(
          graphOf(keysOnly),
          pattern({
            items: ["Order"],
            equal: ["status"],
            returns: ["createdAt"],
          }),
        ),
      ).passed,
    ).toBe(true);
  });

  test("names a missing item type and a missing attribute", () => {
    expect(
      only(evaluate(graphOf(shop()), pattern({ items: ["Invoice"] }))),
    ).toMatchObject({ passed: false, finding: "missing-item" });
    expect(
      only(
        evaluate(
          graphOf(shop()),
          pattern({ items: ["Order"], equal: ["region"] }),
        ),
      ),
    ).toMatchObject({ passed: false, finding: "missing-field" });
  });

  test("cannot read items of two tables in one Query", () => {
    const customers = dynamoTable("customers", { items: [customer()] });
    const orders = dynamoTable("orders", {
      items: [order({ PK: "CUSTOMER#{customerId}", SK: "ORDER#{createdAt}" })],
    });

    expect(
      only(
        evaluate(
          graphOf(customers, orders),
          pattern({ items: ["Customer", "Order"], equal: ["customerId"] }),
        ),
      ),
    ).toMatchObject({ passed: false, finding: "needs-scan" });
  });
});

describe("hot partitions", () => {
  const writes = (perSecond: number, values: number) => ({
    writes: [{ item: "Order", perSecond }],
    cardinality: [{ item: "Order", attribute: "status", values }],
  });

  test("fails an index whose partition key has too few values for the writes", () => {
    const check = only(evaluate(graphOf(shop()), writes(5_000, 4)));

    expect(check).toMatchObject({
      passed: false,
      finding: "hot-partition",
      actual: "1,250 a second on each of 4 partitions of GSI1",
    });
  });

  test("passes when the writes fit under 1,000 a partition", () => {
    expect(only(evaluate(graphOf(shop()), writes(3_000, 4))).passed).toBe(true);
  });

  test("puts every write on one partition when the key is a constant", () => {
    const constant = shop({
      items: [
        customer(),
        order({
          PK: "CUSTOMER#{customerId}",
          SK: "ORDER#{createdAt}",
          GSI1PK: "ORDERS",
          GSI1SK: "{createdAt}",
        }),
      ],
    });

    expect(
      only(
        evaluate(graphOf(constant), {
          writes: [{ item: "Order", perSecond: 1_500 }],
        }),
      ),
    ).toMatchObject({
      passed: false,
      actual: "1,500 a second on one partition of GSI1",
    });
  });

  test("spreads a hot key over shards, which a reader queries one by one", () => {
    const sharded = shop({
      items: [
        customer(),
        order(
          {
            PK: "CUSTOMER#{customerId}",
            SK: "ORDER#{createdAt}",
            GSI1PK: "STATUS#{status}#{shard}",
            GSI1SK: "{createdAt}",
          },
          [attribute("shard", "N", { shards: 10 })],
        ),
      ],
    });
    const result = evaluate(graphOf(sharded), {
      ...writes(5_000, 4),
      ...pattern({ items: ["Order"], equal: ["status"], range: "createdAt" }),
    });

    expect(result.checks.map((check) => [check.passed, check.actual])).toEqual([
      [true, "a Query on each of 10 shards of GSI1"],
      [true, "125 a second on each of 40 partitions of GSI1"],
    ]);
  });

  test("does not let an attribute the problem never mentions read as sharded", () => {
    const random = shop({
      items: [
        customer(),
        order(
          {
            PK: "CUSTOMER#{customerId}",
            SK: "ORDER#{createdAt}",
            GSI1PK: "STATUS#{status}#{nonce}",
            GSI1SK: "{createdAt}",
          },
          [attribute("nonce")],
        ),
      ],
    });
    const result = evaluate(graphOf(random), {
      ...writes(5_000, 4),
      ...pattern({ items: ["Order"], equal: ["status"] }),
    });

    expect(result.checks.map((check) => check.passed)).toEqual([false, true]);
  });
});

describe("item size", () => {
  const lines = {
    apart: [{ item: "Line", from: "Order", max: null, kb: 0.5 }],
  };

  test("fails a list that grows without bound inside its parent", () => {
    const embedded = shop({
      items: [customer(), order(undefined, [attribute("lines", "L")])],
    });

    expect(only(evaluate(graphOf(embedded), lines))).toMatchObject({
      passed: false,
      finding: "item-too-large",
    });
  });

  test("lets a short list stay inside its parent", () => {
    const embedded = shop({
      items: [customer(), order(undefined, [attribute("lines", "L")])],
    });

    expect(
      only(
        evaluate(graphOf(embedded), {
          apart: [{ item: "Line", from: "Order", max: 100, kb: 0.5 }],
        }),
      ).passed,
    ).toBe(true);
  });

  test("passes children kept as items of their own", () => {
    const separate = shop({
      items: [customer(), order(), itemType("Line", [attribute("sku")])],
    });

    expect(only(evaluate(graphOf(separate), lines)).passed).toBe(true);
  });
});

describe("expiry", () => {
  const sessions = (ttlAttribute: string, type: "N" | "S" = "N") =>
    dynamoTable("sessions", {
      ttlAttribute,
      items: [
        itemType(
          "Session",
          [attribute("token"), attribute("expiresAt", type)],
          {
            PK: "SESSION#{token}",
            SK: "SESSION",
          },
        ),
      ],
    });

  test("expires items by a number attribute the table names", () => {
    const requirements = { ttl: [{ item: "Session" }] };

    expect(
      only(evaluate(graphOf(sessions("expiresAt")), requirements)).passed,
    ).toBe(true);
    expect(only(evaluate(graphOf(sessions("")), requirements))).toMatchObject({
      passed: false,
      finding: "missing-ttl",
    });
    expect(
      only(evaluate(graphOf(sessions("expiresAt", "S")), requirements)).passed,
    ).toBe(false);
  });
});

describe("the dynamo-table kind", () => {
  const issues = (table: DynamoTableNode) => {
    const result = catalogue["dynamo-table"].props.safeParse(table.props);

    return result.success
      ? []
      : result.error.issues.map((issue) => issue.message);
  };

  test("accepts the single-table shop", () => {
    expect(issues(shop())).toEqual([]);
  });

  test("refuses a local index that changes the partition key", () => {
    expect(
      issues(
        shop({
          indexes: [gsi("LSI1", "GSI1PK", "GSI1SK", { kind: "local" })],
        }),
      ),
    ).toContain("is a local index, which keeps the table's partition key");
  });

  test("refuses a key template that uses an attribute the item lacks", () => {
    expect(
      issues(shop({ items: [order({ PK: "CUSTOMER#{buyerId}", SK: "X" })] })),
    ).toContain("Order's PK uses {buyerId}, which Order has no attribute for");
  });

  test("refuses a number key that holds more than a number", () => {
    const scores = dynamoTable("scores", {
      attributes: [key("board"), key("score", "N")],
      partitionKey: "board",
      sortKey: "score",
      items: [
        itemType("Score", [attribute("boardId"), attribute("points", "N")], {
          board: "{boardId}",
          score: "SCORE#{points}",
        }),
      ],
    });

    expect(issues(scores)).toContain(
      "Score's score is a number, so it holds one number attribute and nothing else",
    );
  });

  test("lives only in a DynamoDB database", () => {
    const loose = { ...shop(), groupId: null };
    const result = applyOps(emptyGraph(), [{ op: "add-node", node: loose }]);

    expect(result.ok).toBe(false);
  });
});

describe("toCloudFormation", () => {
  test("names each resource once, without saying Table twice", () => {
    const template = JSON.parse(
      toCloudFormation(
        graphOf(
          dynamoTable("DynamoDB table"),
          dynamoTable("events"),
          dynamoTable("Events"),
        ),
      ),
    ) as { Resources: Record<string, unknown> };

    expect(Object.keys(template.Resources)).toEqual([
      "DynamoDBTable",
      "EventsTable",
      "EventsTable2",
    ]);
  });

  test("writes the table, the keys it is queried by, its indexes and TTL", () => {
    const template = JSON.parse(
      toCloudFormation(
        graphOf(
          shop({
            attributes: [
              key("PK"),
              key("SK"),
              key("GSI1PK"),
              key("GSI1SK"),
              key("unused"),
            ],
            ttlAttribute: "expiresAt",
          }),
        ),
      ),
    ) as { Resources: Record<string, { Properties: unknown }> };

    expect(template.Resources.ShopTable?.Properties).toEqual({
      TableName: "shop",
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
        { AttributeName: "GSI1PK", AttributeType: "S" },
        { AttributeName: "GSI1SK", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [
            { AttributeName: "GSI1PK", KeyType: "HASH" },
            { AttributeName: "GSI1SK", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      TimeToLiveSpecification: { AttributeName: "expiresAt", Enabled: true },
    });
  });
});
