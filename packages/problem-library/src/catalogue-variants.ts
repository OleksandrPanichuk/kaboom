import { collection, database, field, graph, refers } from "@repo/design/build";
import type { ProblemContentInput } from "@repo/scoring";

const catalogue = () => database("catalogue", "Catalogue", "mongodb");

const products = () =>
  collection(
    "products",
    "catalogue",
    [
      field("slug", "string", { required: true, maxLength: 120 }),
      field("name", "string", { required: true }),
      field("category", "string", { required: true }),
      field("price", "decimal", { required: true, min: 0 }),
      field("variants", "array", {
        of: "object",
        fields: [
          field("sku", "string", { required: true }),
          field("size", "string"),
          field("colour", "string"),
          field("stock", "int", { min: 0 }),
        ],
      }),
    ],
    [
      {
        id: "slug_idx",
        keys: [{ path: ["slug"], direction: "asc" }],
        unique: true,
      },
      {
        id: "browse_idx",
        keys: [
          { path: ["category"], direction: "asc" },
          { path: ["price"], direction: "asc" },
        ],
        unique: false,
      },
    ],
  );

const reviews = () =>
  collection(
    "reviews",
    "catalogue",
    [
      field("product_id", "objectId", { required: true }),
      field("rating", "int", { required: true, min: 1, max: 5 }),
      field("body", "string"),
      field("posted_at", "date", { required: true }),
    ],
    [
      {
        id: "product_reviews_idx",
        keys: [
          { path: ["product_id"], direction: "asc" },
          { path: ["posted_at"], direction: "desc" },
        ],
        unique: false,
      },
    ],
  );

const reviewsOfProducts = {
  from: "reviews",
  to: "products",
  growth: "unbounded",
} as const;

export const catalogueVariants: ProblemContentInput = {
  slug: "catalogue-variants",
  title: "A product catalogue with variants",
  track: "data-model",
  difficulty: "medium",
  tags: ["mongodb", "embedding", "references", "indexes"],
  summary:
    "Model a MongoDB catalogue where a product page shows its variants in one read, and reviews pile up without slowing it down.",
  statement: `Design the MongoDB collections of a shop's catalogue.

**What it does**

- A product has a slug, a name, a category and a price, and up to 20 variants: each a SKU, a size, a colour and its stock.
- Shoppers write reviews of products: a rating from 1 to 5, some text and when it was posted. A popular product gathers tens of thousands.

**How it is used**

- A product page is found by its slug and shows the product with all its variants in one read.
- A category page lists its products, cheapest first.
- A product's reviews are shown newest first, a page at a time.

**What to watch**

- Two products never share a slug.
- Reviews keep coming; a product's page must not get slower as they do.

The \`products\` and \`reviews\` collections are in the \`Catalogue\` database with no fields yet.`,
  baseline: graph(
    [collection("products", "catalogue"), collection("reviews", "catalogue")],
    [],
    [catalogue()],
  ),
  drills: [
    {
      kind: "documents",
      id: "product-page",
      title: "The product page",
      description:
        "A product is found by its unique slug and carries its variants inside it, and each review points at its product.",
      visibility: "public",
      requirements: {
        embedded: [{ collection: "products", field: "variants", max: 20 }],
        references: [reviewsOfProducts],
        unique: [{ collection: "products", field: "slug" }],
        queries: [
          {
            id: "by-slug",
            title: "Find a product by its slug",
            collection: "products",
            equal: ["slug"],
          },
        ],
      },
    },
    {
      kind: "documents",
      id: "browsing",
      title: "Category pages and reviews",
      description:
        "A category's products come back cheapest first, and a product's reviews newest first, each from an index.",
      visibility: "public",
      requirements: {
        references: [reviewsOfProducts],
        queries: [
          {
            id: "category",
            title: "A category's products, cheapest first",
            collection: "products",
            equal: ["category"],
            sort: [{ field: "price", direction: "asc" }],
          },
          {
            id: "reviews",
            title: "A product's reviews, newest first",
            collection: "reviews",
            equal: ["product_id"],
            sort: [{ field: "posted_at", direction: "desc" }],
          },
        ],
      },
    },
    {
      kind: "documents",
      id: "reviews-scale",
      title: "Tens of thousands of reviews",
      visibility: "hidden",
      requirements: {
        references: [reviewsOfProducts],
      },
    },
  ],
  rubric: [
    {
      key: "product-page",
      title: "Reads a product with its variants in one go, by a unique slug",
      weight: 40,
      check: { check: "drill-passes", drillId: "product-page" },
    },
    {
      key: "browsing",
      title: "Serves category pages and reviews from indexes",
      weight: 35,
      check: { check: "drill-passes", drillId: "browsing" },
    },
    {
      key: "reviews-scale",
      title: "Keeps reviews out of the product document",
      weight: 25,
      check: { check: "drill-passes", drillId: "reviews-scale" },
    },
  ],
  hints: [
    {
      title: "Read together, stored together",
      body: "At most 20 variants, always shown with their product: an array of variant objects inside the product reads in one go.",
      cost: 5,
    },
    {
      title: "Reviews never stop",
      body: "An array of reviews, or of their ids, inside the product grows without bound. Let each review hold its product's _id instead.",
      cost: 10,
    },
    {
      title: "Equality, sort, range",
      body: "An index serves a query when its keys are the equality fields first, then the sort fields: { category: 1, price: 1 } for a category page, { product_id: 1, posted_at: -1 } for reviews.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "products embeds its variants as an array of objects, so a product page is one read, and has a unique index on slug and one on { category, price }. reviews is a collection of its own: each review holds its product_id, with an index on { product_id: 1, posted_at: -1 }, so a product's document never grows with its reviews.",
    graph: graph(
      [products(), reviews()],
      [refers("reviews", ["product_id"], "products")],
      [catalogue()],
    ),
  },
};
