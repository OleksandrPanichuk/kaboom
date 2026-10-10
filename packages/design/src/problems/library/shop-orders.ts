import type { ProblemContentInput } from "../schema";
import { column, graph, id, index, references, table } from "./build";

const customers = () =>
  table("customers", [
    id(),
    column("email", "text", "unique"),
    column("name", "text"),
  ]);

const orders = () =>
  table(
    "orders",
    [
      id(),
      column("customer_id", "bigint"),
      column("placed_at", "timestamptz"),
      column("status", "text"),
    ],
    [index(["customer_id", "placed_at"])],
  );

const products = () =>
  table("products", [
    id(),
    column("sku", "text", "unique"),
    column("name", "text"),
    column("price", "numeric"),
  ]);

const orderItems = () =>
  table(
    "order_items",
    [
      column("order_id", "bigint", "key"),
      column("product_id", "bigint", "key"),
      column("quantity", "integer"),
      column("unit_price", "numeric"),
    ],
    [index(["product_id"])],
  );

export const shopOrders: ProblemContentInput = {
  slug: "shop-orders",
  title: "Orders for an online shop",
  track: "data-model",
  difficulty: "medium",
  tags: ["relationships", "money", "indexes", "line-items"],
  summary:
    "Model customers, products and their orders, so checkout, order history and sales reports each read only what they need.",
  statement: `Design the database behind an online shop's orders.

**What it does**

- Customers sign in with an email address.
- The catalogue lists products, each with a SKU and a price.
- An order belongs to one customer and holds several products, each with a quantity and the price paid for it, which may differ from today's price.

**How it is used**

- Checkout looks a customer up by email and a product up by its SKU.
- A customer's order history lists their orders, newest first.
- An order's page shows its products.
- Sales reports list every order that included a product.

**What to watch**

- Money is exact: a price of 19.99 must never become 19.9899999.
- An order lists a product once, with its quantity, not once per unit.
- None of the queries above may read a whole table.

The \`customers\`, \`orders\` and \`products\` tables are on the canvas with only their keys.`,
  baseline: graph([
    table("customers", [id()]),
    table("orders", [id()]),
    table("products", [id()]),
  ]),
  drills: [
    {
      kind: "schema",
      id: "checkout",
      title: "Checkout and order history",
      description:
        "Each order has one customer and many products, a customer is found by email, and their orders come back newest first from an index.",
      visibility: "public",
      requirements: {
        relationships: [
          { cardinality: "one-to-many", parent: "customers", child: "orders" },
          { cardinality: "many-to-many", between: ["orders", "products"] },
        ],
        columns: [
          { table: "customers", name: "email", type: "text", unique: true },
          { table: "orders", name: "placed_at", type: "timestamptz" },
        ],
        queries: [
          {
            id: "sign-in",
            title: "Find a customer by email",
            from: "customers",
            by: ["email"],
          },
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
      id: "catalogue",
      title: "The catalogue",
      description:
        "A product is found by its SKU, and its price is an exact amount that is always set.",
      visibility: "public",
      requirements: {
        relationships: [
          { cardinality: "many-to-many", between: ["orders", "products"] },
        ],
        columns: [
          { table: "products", name: "sku", type: "text", unique: true },
          {
            table: "products",
            name: "price",
            type: "numeric",
            nullable: false,
          },
        ],
        queries: [
          {
            id: "by-sku",
            title: "Find a product by SKU",
            from: "products",
            by: ["sku"],
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "sales-report",
      title: "Sales reports",
      visibility: "hidden",
      requirements: {
        relationships: [
          { cardinality: "one-to-many", parent: "customers", child: "orders" },
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
      key: "checkout",
      title:
        "Relates customers, orders and products, and serves checkout from indexes",
      weight: 40,
      check: { check: "drill-passes", drillId: "checkout" },
    },
    {
      key: "catalogue",
      title: "Keeps prices exact and finds products by SKU",
      weight: 25,
      check: { check: "drill-passes", drillId: "catalogue" },
    },
    {
      key: "sales-report",
      title: "Answers sales reports from an index, with sound keys",
      weight: 35,
      check: { check: "drill-passes", drillId: "sales-report" },
    },
  ],
  hints: [
    {
      title: "What is a line of an order?",
      body: "An order holds many products and a product sits in many orders. A table of order lines, one row per order and product, holds the quantity and the price paid, which belongs to the line and not to the product.",
      cost: 5,
    },
    {
      title: "Exact money",
      body: "Floating-point types round. A numeric column keeps the cents exactly as written.",
      cost: 10,
    },
    {
      title: "The report scans",
      body: "A key on (order_id, product_id) finds an order's lines, but not a product's: that lookup needs an index that leads with product_id.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Orders reference their customer. An order_items table keyed by (order_id, product_id) holds each line's quantity and the unit price paid, and an index on product_id serves the sales report. An index on orders (customer_id, placed_at) serves the order history. Email and SKU are unique, and prices are numeric.",
    graph: graph(
      [customers(), orders(), products(), orderItems()],
      [
        references("orders", "customer_id", "customers"),
        references("order_items", "order_id", "orders", "cascade"),
        references("order_items", "product_id", "products"),
      ],
    ),
  },
};
