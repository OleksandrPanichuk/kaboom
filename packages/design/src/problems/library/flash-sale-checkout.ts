import type { DesignGroup } from "../../graph";
import type { ProblemContentInput } from "../schema";
import {
  column,
  database,
  edge,
  graph,
  id,
  index,
  node,
  pooled,
  references,
  table,
  within,
} from "./build";

const shop = (): DesignGroup => ({
  ...database("shop", "Shop", "postgres"),
  storedOn: "orders-db",
});

const shoppers = () =>
  node("shoppers", "client", "Shoppers", { rps: 1_000, readRatio: 0.8 });

const checkout = (warm = 15) =>
  node("checkout", "service", "Checkout", {
    replicas: warm,
    capacityRpsPerReplica: 100,
    autoscale: {
      enabled: true,
      min: warm,
      max: 600,
      targetUtilisation: 0.7,
    },
  });

const ordersDb = (props: Record<string, unknown> = {}) =>
  node("orders-db", "sql-database", "Orders DB", props);

const customers = () =>
  within(
    "shop",
    table("customers", [
      id(),
      column("email", "text", "unique"),
      column("name", "text"),
    ]),
  );

const products = () =>
  within(
    "shop",
    table("products", [
      id(),
      column("sku", "text", "unique"),
      column("name", "text"),
      column("price", "numeric"),
    ]),
  );

const orders = () =>
  within(
    "shop",
    table(
      "orders",
      [
        id(),
        column("customer_id", "bigint"),
        column("placed_at", "timestamptz"),
      ],
      [index(["customer_id", "placed_at"])],
    ),
  );

const orderLines = () =>
  within(
    "shop",
    table(
      "order_lines",
      [
        column("order_id", "bigint", "key"),
        column("product_id", "bigint", "key"),
        column("quantity", "integer"),
        column("unit_price", "numeric"),
      ],
      [index(["product_id"])],
    ),
  );

const sale = [
  { at: 60, multiplier: 1.5 },
  { at: 80, multiplier: 2 },
  { at: 100, multiplier: 3 },
  { at: 120, multiplier: 4 },
  { at: 140, multiplier: 6 },
  { at: 160, multiplier: 8 },
  { at: 180, multiplier: 11 },
  { at: 200, multiplier: 15 },
  { at: 220, multiplier: 20 },
];

export const flashSaleCheckout: ProblemContentInput = {
  slug: "flash-sale-checkout",
  title: "Checkout under a flash sale",
  track: "data-model",
  difficulty: "hard",
  tags: ["connection-pooling", "relationships", "indexes", "autoscaling"],
  summary:
    "Design a shop's orders tables and the path to them, so checkout keeps working when a flash sale scales the service out twentyfold.",
  statement: `Design a shop's checkout: the service, how it reaches PostgreSQL, and the tables it writes.

**What it does**

- Customers sign in with an email address and buy products, each with a SKU and a price.
- An order belongs to one customer and holds several products, each with a quantity and the price paid, which may differ from today's price.

**How it is used**

- 1,000 requests a second on a normal day, 80 % of them reads.
- A flash sale climbs to twenty times that over about three minutes and holds; once the service has caught up, 99.9 % of requests must succeed, with p99 under 400 ms.
- A customer's order history lists their orders, newest first, and an order's page shows its products.

**What to watch**

- A checkout replica serves 100 requests a second and holds a pool of ten connections to the database. The service scales from 15 replicas up to 600.
- The database accepts 1,000 connections.
- Money is exact, and none of the queries above may read a whole table.

*Shoppers*, the *Checkout* service and the *Orders DB* are on the canvas. The *Shop* database lives on the Orders DB, with the \`customers\`, \`orders\` and \`products\` tables holding only their keys.`,
  baseline: graph(
    [
      shoppers(),
      checkout(),
      ordersDb(),
      within("shop", table("customers", [id()])),
      within("shop", table("orders", [id()])),
      within("shop", table("products", [id()])),
    ],
    [],
    [shop()],
  ),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "1,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 400, availability: 0.999 },
      expect: { maxP99Ms: 400, minAvailability: 0.999 },
    },
    {
      id: "flash-sale",
      title: "The flash sale",
      description:
        "Traffic climbs to twenty times the usual over about three minutes and holds. The service takes a while to scale out, but once it has, every request must succeed again.",
      visibility: "public",
      durationSeconds: 480,
      traffic: sale,
      slo: { p99Ms: 400, availability: 0.9 },
      expect: {
        minAvailability: 0.9,
        endAvailability: 0.999,
        endMaxP99Ms: 400,
        forbid: ["connections-exhausted"],
      },
    },
    {
      kind: "schema",
      id: "orders",
      title: "Orders and their lines",
      description:
        "Each order has one customer and many products, prices are exact, and a customer's orders and an order's products come from indexes.",
      visibility: "public",
      requirements: {
        relationships: [
          { cardinality: "one-to-many", parent: "customers", child: "orders" },
          { cardinality: "many-to-many", between: ["orders", "products"] },
        ],
        columns: [
          { table: "customers", name: "email", type: "text", unique: true },
          { table: "orders", name: "placed_at", type: "timestamptz" },
          {
            table: "products",
            name: "price",
            type: "numeric",
            nullable: false,
          },
        ],
        queries: [
          {
            id: "history",
            title: "A customer's orders, newest first",
            from: "customers",
            by: ["id"],
            to: "orders",
            orderBy: ["placed_at"],
          },
          {
            id: "order-page",
            title: "An order's products",
            from: "orders",
            by: ["id"],
            to: "products",
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "sales-report",
      title: "Who bought a product",
      visibility: "hidden",
      requirements: {
        relationships: [
          { cardinality: "many-to-many", between: ["orders", "products"] },
        ],
        queries: [
          {
            id: "orders-with-product",
            title: "Every order that included a product",
            from: "products",
            by: ["id"],
            to: "orders",
          },
        ],
      },
      expect: {
        forbid: ["keyless-table", "fk-type-mismatch", "set-null-not-nullable"],
      },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Handles a normal day within the SLO",
      weight: 15,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "survives-the-sale",
      title: "Keeps checking out once the service has scaled out",
      weight: 30,
      check: { check: "drill-passes", drillId: "flash-sale" },
    },
    {
      key: "pools-connections",
      title: "Pools the service's connections in front of the database",
      weight: 15,
      check: {
        check: "has-node-kind",
        nodeKind: "connection-pooler",
        drillId: "flash-sale",
      },
    },
    {
      key: "orders",
      title: "Relates customers, orders and products, served by indexes",
      weight: 25,
      check: { check: "drill-passes", drillId: "orders" },
    },
    {
      key: "sales-report",
      title: "Finds a product's orders from an index, with sound keys",
      weight: 15,
      check: { check: "drill-passes", drillId: "sales-report" },
    },
  ],
  hints: [
    {
      title: "Count the connections",
      body: "20,000 requests a second at 100 a replica, kept at 70 % busy, is nearly 300 replicas, and the autoscaler adds half again at a time. Ten connections each is several thousand; the database accepts 1,000.",
      cost: 5,
    },
    {
      title: "A pooler, and its own pool",
      body: "A connection pooler takes every replica's connections and lends its own. At about 5 ms a query, one server connection carries 200 requests a second, so 20,000 need at least a hundred.",
      cost: 10,
    },
    {
      title: "What is a line of an order?",
      body: "A table of order lines, one row per order and product, holds the quantity and the price paid. Its key serves an order's products; a product's orders need an index that leads with product_id.",
      cost: 10,
    },
  ],
  reference: {
    notes:
      "Checkout keeps 30 replicas warm and calls a pooler with its pool of ten; the pooler holds 200 connections to the Orders DB, which carries 40,000 requests a second at about 5 ms a query, twice the peak. The database is sized for the peak's 16,000 reads and 4,000 writes. In the Shop database, orders reference their customer and are indexed by (customer_id, placed_at); an order_lines table keyed by (order_id, product_id) holds each line's quantity and the price paid, with an index on product_id for the report. Email and SKU are unique and prices are numeric.",
    graph: graph(
      [
        shoppers(),
        checkout(30),
        node("pooler", "connection-pooler", "Pooler"),
        ordersDb({ readCapacityRps: 25_000, writeCapacityRps: 6_000 }),
        customers(),
        orders(),
        products(),
        orderLines(),
      ],
      [
        edge("shoppers", "checkout", "sync-call"),
        edge("checkout", "pooler", "sync-call"),
        pooled(edge("pooler", "orders-db", "sync-call"), 200),
        references("orders", "customer_id", "customers"),
        references("order_lines", "order_id", "orders", "cascade"),
        references("order_lines", "product_id", "products"),
      ],
      [shop()],
    ),
  },
};
