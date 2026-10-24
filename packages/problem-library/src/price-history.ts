import type { Column } from "@repo/design";
import {
  column,
  graph,
  id,
  index,
  references,
  table,
} from "@repo/design/build";
import type { ProblemContentInput } from "@repo/scoring";

const products = () =>
  table("products", [
    id(),
    column("sku", "text", "unique"),
    column("name", "text"),
  ]);

const money = (): Column => ({
  ...column("amount", "numeric"),
  precision: 12,
  scale: 2,
});

const prices = () =>
  table(
    "prices",
    [
      id(),
      column("product_id", "bigint"),
      money(),
      { ...column("currency", "char"), length: 3 },
      { ...column("valid_from", "timestamptz"), default: { kind: "now" } },
      column("valid_to", "timestamptz", "null"),
    ],
    [
      index(["product_id", "valid_from"]),
      {
        id: "current_price_idx",
        columns: ["product_id"],
        unique: true,
        where: { column: "valid_to", op: "is-null" },
      },
    ],
  );

const structural = [
  "keyless-table",
  "fk-type-mismatch",
  "set-null-not-nullable",
] as const;

const productsHavePrices = {
  cardinality: "one-to-many",
  parent: "products",
  child: "prices",
} as const;

export const priceHistory: ProblemContentInput = {
  slug: "price-history",
  title: "A catalogue that remembers its prices",
  track: "data-model",
  difficulty: "medium",
  tags: ["history", "money", "partial-indexes", "ranges"],
  summary:
    "Keep every price a product has had, so the shop can show today's price instantly and tell what it cost on the day of any order.",
  statement: `Design the tables behind a shop's prices, and keep their history.

**What it does**

- A product has a SKU and a name.
- Its price changes now and then. Every price is an amount in a currency, valid from the moment it is set until the next change.
- The price in force today has no end yet.

**How it is used**

- Every page view reads a product's current price.
- A refund or a dispute asks what a product cost on a given date.
- The product page shows the history, newest first.
- A busy product may have thousands of prices over the years.

**What to watch**

- Money is exact, to the cent, in a three-letter currency code.
- A product should never have two current prices.
- The current price is read on every request, so it must not search the history.

The \`products\` table and an empty \`prices\` table are on the canvas. Finish the model.`,
  baseline: graph([
    table("products", [id(), column("sku", "text"), column("name", "text")]),
    table("prices", [id()]),
  ]),
  drills: [
    {
      kind: "schema",
      id: "price-rows",
      title: "A price per period, exact",
      description:
        "Each price belongs to a product, is an exact amount with a currency code, and starts when it is set.",
      visibility: "public",
      requirements: {
        relationships: [productsHavePrices],
        columns: [
          { table: "products", name: "sku", type: "text", unique: true },
          {
            table: "prices",
            name: "amount",
            type: "numeric",
            nullable: false,
          },
          {
            table: "prices",
            name: "currency",
            type: "char",
            nullable: false,
            maxLength: 3,
          },
          {
            table: "prices",
            name: "valid_from",
            type: "timestamptz",
            nullable: false,
            defaultsTo: "now",
          },
          {
            table: "prices",
            name: "valid_to",
            type: "timestamptz",
            nullable: true,
          },
        ],
      },
      expect: { forbid: [...structural] },
    },
    {
      kind: "schema",
      id: "current-price",
      title: "Today's price",
      description:
        "A product's current price, the one that has not ended, is found without reading its history.",
      visibility: "public",
      requirements: {
        relationships: [productsHavePrices],
        queries: [
          {
            id: "current",
            title: "A product's current price",
            from: "prices",
            by: ["product_id"],
            where: { column: "valid_to", op: "is-null" },
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "price-on-a-date",
      title: "The price on a date, and the history",
      description:
        "What a product cost on a given date is a range lookup, and the history comes back newest first.",
      visibility: "public",
      requirements: {
        relationships: [productsHavePrices],
        queries: [
          {
            id: "as-of",
            title: "What a product cost on a date",
            from: "prices",
            by: ["product_id"],
            match: { column: "valid_from", kind: "range" },
          },
          {
            id: "history",
            title: "A product's prices, newest first",
            from: "products",
            by: ["id"],
            to: "prices",
            orderBy: ["valid_from"],
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "product-page",
      title: "A product's page, found by SKU",
      description:
        "The page opens from a SKU and lists the product's prices, newest first, without reading anyone else's.",
      visibility: "hidden",
      requirements: {
        relationships: [productsHavePrices],
        queries: [
          {
            id: "page",
            title: "A product's prices by SKU, newest first",
            from: "products",
            by: ["sku"],
            to: "prices",
            orderBy: ["valid_from"],
          },
        ],
      },
      expect: { forbid: [...structural] },
    },
  ],
  rubric: [
    {
      key: "price-rows",
      title: "Stores each price exactly, with a currency and a start",
      weight: 30,
      check: { check: "drill-passes", drillId: "price-rows" },
    },
    {
      key: "current-price",
      title: "Reads the current price from an index that skips the history",
      weight: 30,
      check: { check: "drill-passes", drillId: "current-price" },
    },
    {
      key: "price-on-a-date",
      title: "Finds the price on a date and lists the history from an index",
      weight: 25,
      check: { check: "drill-passes", drillId: "price-on-a-date" },
    },
    {
      key: "product-page",
      title: "Opens a product's page from its SKU, with sound keys",
      weight: 15,
      check: { check: "drill-passes", drillId: "product-page" },
    },
  ],
  hints: [
    {
      title: "A period, not just a price",
      body: "Each price row says from when it holds. The price in force today is the one with no end yet, so leave `valid_to` empty for it, and keep `valid_from` filled in.",
      cost: 5,
    },
    {
      title: "Today's price among thousands",
      body: "An index on (product_id, valid_from) finds the history, but the current price is one row among thousands. A partial index on product_id where valid_to is null holds only current prices, so reading one is a single lookup, and making it unique stops a second one.",
      cost: 10,
    },
    {
      title: "On a date",
      body: "'What did it cost on 3 March' is a range: the latest price whose valid_from is on or before the date. A btree whose second column is valid_from serves it, reading the product's rows in date order.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "products keeps its unique SKU. prices references its product, holds an exact numeric(12,2) amount with a three-character currency, a valid_from that defaults to now and a valid_to that is empty while the price is in force. An index on (product_id, valid_from) serves both the history, newest first, and the price on a date as a range. A unique partial index on product_id where valid_to is null holds only current prices, so today's price is one lookup, and a product can never have two.",
    graph: graph(
      [products(), prices()],
      [references("prices", "product_id", "products", "cascade")],
    ),
  },
};
