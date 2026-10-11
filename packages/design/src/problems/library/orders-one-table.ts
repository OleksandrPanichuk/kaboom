import type { ProblemContentInput } from "../schema";
import {
  attribute,
  database,
  dynamoTable,
  globalIndex,
  graph,
  itemType,
  keyAttribute,
} from "./build";

const store = () => database("store", "Store", "dynamodb");

const customer = (keys: Record<string, string> = {}) =>
  itemType(
    "Customer",
    [attribute("customerId"), attribute("email"), attribute("name")],
    keys,
  );

const order = (keys: Record<string, string> = {}, shard = false) =>
  itemType(
    "Order",
    [
      attribute("customerId"),
      attribute("orderId"),
      attribute("status"),
      attribute("createdAt"),
      attribute("total", "N"),
      ...(shard ? [attribute("shard", "N", { shards: 4 })] : []),
    ],
    keys,
  );

const orderLine = (keys: Record<string, string> = {}) =>
  itemType(
    "OrderLine",
    [
      attribute("orderId"),
      attribute("sku"),
      attribute("quantity", "N"),
      attribute("price", "N"),
    ],
    keys,
  );

const customerPage = [
  {
    id: "profile-and-orders",
    title: "A customer with their latest orders, in one query",
    items: ["Customer", "Order"],
    equal: ["customerId"],
  },
  {
    id: "order-history",
    title: "A customer's orders between two dates",
    items: ["Order"],
    equal: ["customerId"],
    range: "createdAt",
  },
];

const orderPage = {
  id: "order-with-lines",
  title: "An order with all its lines, in one query",
  items: ["Order", "OrderLine"],
  equal: ["orderId"],
};

const statusBoard = {
  id: "status-board",
  title: "Orders in a status, oldest first, with their totals",
  items: ["Order"],
  equal: ["status"],
  range: "createdAt",
  returns: ["orderId", "total"],
};

const linesApart = {
  item: "OrderLine",
  from: "Order",
  max: 1_000,
  kb: 0.5,
};

const peak = {
  writes: [{ item: "Order", perSecond: 6_000 }],
  cardinality: [{ item: "Order", attribute: "status", values: 4 }],
};

export const ordersOneTable: ProblemContentInput = {
  slug: "orders-one-table",
  title: "Orders in one DynamoDB table",
  track: "data-model",
  difficulty: "hard",
  tags: ["dynamodb", "single-table", "gsi", "write-sharding"],
  summary:
    "Fit customers, orders and their lines into one DynamoDB table, so every page is one query and the status board survives a sale.",
  statement: `Design the DynamoDB table of a shop's orders.

**What it does**

- A customer has an id, an email and a name.
- A customer places orders: each has an id, a status (\`placed\`, \`paid\`, \`shipped\` or \`delivered\`), when it was created and its total.
- An order has lines: a SKU, a quantity and a price. A wholesale order can have up to 1,000 lines of about half a kilobyte each.

**How it is used**

- A customer's page shows the customer and their latest orders, from one query.
- Their history lists their orders between two dates.
- An order's page shows the order and all its lines, from one query.
- The warehouse watches every order in a status, oldest first, with its id and total.

**What to watch**

- At the peak of a sale, orders are written 6,000 times a second, counting new orders and status changes.
- An item stops at 400 KB, and a partition takes 1,000 writes a second.

The \`shop\` table in the \`Store\` database already lists the three item types and their attributes. Give it keys, indexes and the templates each item fills them with.`,
  baseline: graph(
    [
      dynamoTable("shop", "store", {
        items: [customer(), order(), orderLine()],
      }),
    ],
    [],
    [store()],
  ),
  drills: [
    {
      kind: "key-value",
      id: "customer-page",
      title: "A customer's page",
      description:
        "The customer and their orders share a partition, sorted by when each order was made.",
      visibility: "public",
      requirements: { patterns: customerPage },
    },
    {
      kind: "key-value",
      id: "order-page",
      title: "An order's page",
      description:
        "An order and its lines come back from one query, and the lines are items of their own.",
      visibility: "public",
      requirements: { patterns: [orderPage], apart: [linesApart] },
    },
    {
      kind: "key-value",
      id: "status-board",
      title: "The warehouse's status board",
      description:
        "Orders in a status come back oldest first from an index that carries their totals.",
      visibility: "public",
      requirements: { patterns: [statusBoard] },
    },
    {
      kind: "key-value",
      id: "sale-peak",
      title: "Six thousand writes a second",
      visibility: "hidden",
      requirements: { patterns: [statusBoard], ...peak },
    },
  ],
  rubric: [
    {
      key: "customer-page",
      title: "Reads a customer and their orders from one partition",
      weight: 30,
      check: { check: "drill-passes", drillId: "customer-page" },
    },
    {
      key: "order-page",
      title: "Reads an order with its lines in one query",
      weight: 25,
      check: { check: "drill-passes", drillId: "order-page" },
    },
    {
      key: "status-board",
      title: "Serves the status board from an index",
      weight: 20,
      check: { check: "drill-passes", drillId: "status-board" },
    },
    {
      key: "sale-peak",
      title: "Keeps the status index from running hot",
      weight: 25,
      check: { check: "drill-passes", drillId: "sale-peak" },
    },
  ],
  hints: [
    {
      title: "Generic key names",
      body: "Call the keys PK and SK and let each item fill them: a customer as CUSTOMER#<id> / PROFILE, its orders as CUSTOMER#<id> / ORDER#<createdAt>#<orderId>. One Query on the customer's partition returns both.",
      cost: 5,
    },
    {
      title: "Turn the relationship over",
      body: "An order cannot sit in its customer's partition and its own at once in the table, but it can in an index: a global index keyed by ORDER#<orderId>, which the order's lines fill too.",
      cost: 10,
    },
    {
      title: "Four statuses, six thousand writes",
      body: "An index keyed by status alone has four partitions, 1,500 writes a second each. Add a shard number to the key, with shards set on the attribute, and read the board by querying each shard.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "One table keyed by PK and SK. A customer is CUSTOMER#<customerId> / PROFILE and each of its orders CUSTOMER#<customerId> / ORDER#<createdAt>#<orderId>, so the customer page and the history are one Query. Each line is an item of its own, ORDER#<orderId> / LINE#<sku>. GSI1 turns the order over: an order fills it with ORDER#<orderId> / ORDER and each line with ORDER#<orderId> / LINE#<sku>. GSI2 serves the status board, keyed by STATUS#<status>#<shard> and createdAt, with four shards so 6,000 writes a second spread over sixteen partitions, and it includes orderId and total.",
    graph: graph(
      [
        dynamoTable("shop", "store", {
          attributes: [
            keyAttribute("PK"),
            keyAttribute("SK"),
            keyAttribute("GSI1PK"),
            keyAttribute("GSI1SK"),
            keyAttribute("GSI2PK"),
            keyAttribute("GSI2SK"),
          ],
          partitionKey: "PK",
          sortKey: "SK",
          indexes: [
            globalIndex("GSI1", "GSI1PK", "GSI1SK"),
            globalIndex("GSI2", "GSI2PK", "GSI2SK", {
              projection: "include",
              include: ["orderId", "total"],
            }),
          ],
          items: [
            customer({ PK: "CUSTOMER#{customerId}", SK: "PROFILE" }),
            order(
              {
                PK: "CUSTOMER#{customerId}",
                SK: "ORDER#{createdAt}#{orderId}",
                GSI1PK: "ORDER#{orderId}",
                GSI1SK: "ORDER",
                GSI2PK: "STATUS#{status}#{shard}",
                GSI2SK: "{createdAt}",
              },
              true,
            ),
            orderLine({
              PK: "ORDER#{orderId}",
              SK: "LINE#{sku}",
              GSI1PK: "ORDER#{orderId}",
              GSI1SK: "LINE#{sku}",
            }),
          ],
        }),
      ],
      [],
      [store()],
    ),
  },
};
