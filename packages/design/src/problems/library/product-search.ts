import type { Column } from "../../catalogue";
import type { ProblemContentInput } from "../schema";
import {
  column,
  database,
  graph,
  id,
  references,
  table,
  within,
} from "./build";

const identity = (): Column => ({
  ...id(),
  generated: { kind: "identity", always: false },
});

const categories = () =>
  within(
    "shop",
    table("categories", [
      identity(),
      { ...column("name", "varchar", "unique"), length: 100 },
    ]),
  );

const products = () =>
  within(
    "shop",
    table(
      "products",
      [
        identity(),
        column("category_id", "bigint"),
        { ...column("sku", "varchar", "unique"), length: 32 },
        { ...column("name", "varchar"), length: 200 },
        column("description", "text"),
        { ...column("price", "numeric"), precision: 10, scale: 2 },
        column("attributes", "json", "null"),
      ],
      [
        {
          id: "category_price_idx",
          columns: ["category_id", "price"],
          unique: false,
        },
        {
          id: "description_text_idx",
          columns: ["description"],
          unique: false,
          method: "fulltext",
        },
      ],
    ),
  );

const shop = () => database("shop", "Shop", "mysql");

const categoriesHaveProducts = {
  cardinality: "one-to-many",
  parent: "categories",
  child: "products",
} as const;

export const productSearch: ProblemContentInput = {
  slug: "product-search",
  title: "Product search on MySQL",
  track: "data-model",
  difficulty: "medium",
  tags: ["mysql", "full-text", "money", "json"],
  summary:
    "Model a MySQL catalogue that browses a category by price, finds a SKU, and searches descriptions by their words.",
  statement: `Design the MySQL tables of a shop's catalogue.

**What it does**

- A product belongs to one category and has a SKU of up to 32 characters, a name, a description and a price.
- Each product also has attributes that differ by category, such as a size or a voltage, kept as a document.

**How it is used**

- A category's page lists its products, cheapest first.
- Checkout finds a product by its SKU.
- The search box finds the products whose description contains the words typed.

**What to watch**

- Prices are exact, with two digits after the point, and up to 99,999,999.99.
- The database is MySQL: use what MySQL has.

The \`categories\` and \`products\` tables are in the \`Shop\` database with only their keys.`,
  baseline: graph(
    [
      within("shop", table("categories", [id()])),
      within("shop", table("products", [id()])),
    ],
    [],
    [shop()],
  ),
  drills: [
    {
      kind: "schema",
      id: "browse",
      title: "Browsing and checkout",
      description:
        "Prices are exact to the cent, a category's products come back cheapest first from an index, and a SKU is found from an index.",
      visibility: "public",
      requirements: {
        relationships: [categoriesHaveProducts],
        columns: [
          {
            table: "products",
            name: "price",
            type: "numeric",
            precision: 10,
            scale: 2,
          },
        ],
        queries: [
          {
            id: "category-page",
            title: "A category's products, cheapest first",
            from: "categories",
            by: ["id"],
            to: "products",
            orderBy: ["price"],
          },
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
      id: "search",
      title: "The search box",
      description:
        "A SKU is bounded, and searching descriptions by their words is served by an index.",
      visibility: "public",
      requirements: {
        relationships: [categoriesHaveProducts],
        columns: [{ table: "products", name: "sku", maxLength: 32 }],
        queries: [
          {
            id: "search-box",
            title: "Products whose description matches the words typed",
            from: "products",
            match: { column: "description", kind: "text-search" },
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "mysql-only",
      title: "Only what MySQL has",
      visibility: "hidden",
      requirements: {
        relationships: [categoriesHaveProducts],
        columns: [{ table: "products", name: "attributes", type: "json" }],
      },
      expect: {
        forbid: [
          "keyless-table",
          "fk-type-mismatch",
          "set-null-not-nullable",
          "engine-unsupported",
        ],
      },
    },
  ],
  rubric: [
    {
      key: "browse",
      title: "Keeps prices exact and serves browsing and checkout from indexes",
      weight: 40,
      check: { check: "drill-passes", drillId: "browse" },
    },
    {
      key: "search",
      title: "Searches descriptions with a full-text index",
      weight: 35,
      check: { check: "drill-passes", drillId: "search" },
    },
    {
      key: "mysql-only",
      title: "Uses only what MySQL has, with sound keys",
      weight: 25,
      check: { check: "drill-passes", drillId: "mysql-only" },
    },
  ],
  hints: [
    {
      title: "Exact money",
      body: "A double rounds. `decimal(10, 2)` keeps every cent, up to 99,999,999.99.",
      cost: 5,
    },
    {
      title: "Words, not prefixes",
      body: "A btree on the description answers `LIKE 'abc%'` at best. MySQL's FULLTEXT index answers `MATCH (description) AGAINST (...)`.",
      cost: 10,
    },
    {
      title: "MySQL is not PostgreSQL",
      body: "MySQL has `json`, not `jsonb`, and a varchar always needs a length.",
      cost: 10,
    },
  ],
  reference: {
    notes:
      "products references its category and has an index on (category_id, price) for the category page. The SKU is a unique varchar(32), the price a decimal(10, 2), the description has a FULLTEXT index for the search box, and attributes is MySQL's json.",
    graph: graph(
      [categories(), products()],
      [references("products", "category_id", "categories")],
      [shop()],
    ),
  },
};
