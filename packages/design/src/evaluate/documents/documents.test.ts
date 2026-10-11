import { describe, expect, test } from "bun:test";

import { collection, field, refers } from "../../data-model/fixtures";
import { toMongo } from "../../data-model/mongo";
import {
  createGroup,
  type DesignEdge,
  type DesignNode,
  emptyGraph,
} from "../../graph";
import { applyOps } from "../../ops";
import { evaluateDocuments } from "./evaluate-documents";
import { DocumentRequirementsSchema } from "./requirements";

const store = createGroup({
  id: "store",
  kind: "database",
  label: "Store",
  engine: "mongodb",
});

const graphOf = (nodes: DesignNode[], edges: DesignEdge[] = []) => ({
  ...emptyGraph(),
  groups: [store],
  nodes,
  edges,
});

const products = (variants = true) =>
  collection(
    "products",
    [
      field("sku", "string", { required: true }),
      field("category", "string"),
      field("price", "decimal"),
      ...(variants
        ? [
            field("variants", "array", {
              of: "object",
              fields: [field("size", "string")],
            }),
          ]
        : []),
    ],
    [
      { id: "sku", keys: [{ path: ["sku"], direction: "asc" }], unique: true },
      {
        id: "browse",
        keys: [
          { path: ["category"], direction: "asc" },
          { path: ["price"], direction: "asc" },
        ],
        unique: false,
      },
    ],
  );

const reviews = (indexed = true) =>
  collection(
    "reviews",
    [
      field("product_id", "objectId", { required: true }),
      field("posted_at", "date"),
    ],
    indexed
      ? [
          {
            id: "by_product",
            keys: [
              { path: ["product_id"], direction: "asc" },
              { path: ["posted_at"], direction: "desc" },
            ],
            unique: false,
          },
        ]
      : [],
  );

const evaluate = (graph: ReturnType<typeof graphOf>, requirements: unknown) =>
  evaluateDocuments(graph, DocumentRequirementsSchema.parse(requirements));

const verdicts = (result: ReturnType<typeof evaluate>) =>
  result.checks.map((check) => [check.label, check.passed, check.finding]);

describe("collections in applyOps", () => {
  test("live only in a MongoDB database, and reference from an objectId field", () => {
    const loose = applyOps(emptyGraph(), [
      { op: "add-node", node: { ...products(), groupId: null } },
    ]);
    const placed = applyOps(graphOf([products(), reviews()]), [
      { op: "add-edge", edge: refers("reviews", ["product_id"], "products") },
    ]);
    const wrongType = applyOps(graphOf([products(), reviews()]), [
      { op: "add-edge", edge: refers("reviews", ["posted_at"], "products") },
    ]);

    expect(!loose.ok && loose.message).toBe(
      "products is a collection; it lives in a MongoDB database",
    );
    expect(placed.ok).toBe(true);
    expect(!wrongType.ok && wrongType.message).toBe(
      "reviews.posted_at is a date; a reference holds an objectId, or an array of them",
    );
  });

  test("refuse removing a field a reference starts at", () => {
    const graph = graphOf(
      [products(), reviews()],
      [refers("reviews", ["product_id"], "products")],
    );
    const result = applyOps(graph, [
      {
        op: "update-node",
        id: "reviews",
        patch: { props: { fields: [field("posted_at", "date")], indexes: [] } },
      },
    ]);

    expect(!result.ok && result.message).toContain("does not have");
  });
});

describe("documents evaluator", () => {
  const graph = () =>
    graphOf(
      [products(), reviews()],
      [refers("reviews", ["product_id"], "products")],
    );

  test("asks for what is read together to be embedded", () => {
    const requirement = {
      embedded: [{ collection: "products", field: "variants", max: 20 }],
    };

    expect(verdicts(evaluate(graph(), requirement))).toEqual([
      ["products.variants, embedded", true, null],
    ]);
    expect(
      evaluate(graphOf([products(false), reviews()]), requirement).checks[0]
        ?.finding,
    ).toBe("not-embedded");
  });

  test("refuses an array that grows without bound on the parent", () => {
    const requirement = {
      references: [{ from: "reviews", to: "products", growth: "unbounded" }],
    };
    const hoarding = graphOf(
      [
        collection("products", [
          field("sku", "string"),
          field("review_ids", "array", { of: "objectId" }),
        ]),
        reviews(),
      ],
      [refers("products", ["review_ids"], "reviews")],
    );

    expect(verdicts(evaluate(graph(), requirement))).toEqual([
      ["reviews references products", true, null],
    ]);
    expect(evaluate(hoarding, requirement).checks[0]?.finding).toBe(
      "unbounded-array",
    );
  });

  test("serves a query by equality, then sort, then range, either direction", () => {
    const requirement = {
      queries: [
        {
          id: "reviews",
          title: "A product's reviews, newest first",
          collection: "reviews",
          equal: ["product_id"],
          sort: [{ field: "posted_at", direction: "desc" }],
        },
        {
          id: "oldest",
          title: "A product's reviews, oldest first",
          collection: "reviews",
          equal: ["product_id"],
          sort: [{ field: "posted_at", direction: "asc" }],
        },
        {
          id: "cheap",
          title: "A category's products under a price",
          collection: "products",
          equal: ["category"],
          range: "price",
        },
        {
          id: "price-first",
          title: "Products in a price range, by category",
          collection: "products",
          equal: [],
          sort: [{ field: "category", direction: "asc" }],
          range: "sku",
        },
      ],
    };

    expect(verdicts(evaluate(graph(), requirement))).toEqual([
      ["A product's reviews, newest first", true, null],
      ["A product's reviews, oldest first", true, null],
      ["A category's products under a price", true, null],
      ["Products in a price range, by category", false, "unindexed-query"],
    ]);
  });

  test("asks for unique and expiring fields to be indexed so", () => {
    const result = evaluate(graph(), {
      unique: [{ collection: "products", field: "sku" }],
      ttl: [{ collection: "reviews", field: "posted_at" }],
    });

    expect(verdicts(result)).toEqual([
      ["products.sku, unique", true, null],
      ["reviews.posted_at, expires", false, "missing-ttl"],
    ]);
  });
});

describe("toMongo", () => {
  test("writes a validator per collection and its indexes", () => {
    const mongo = toMongo(graphOf([reviews()]));

    expect(mongo).toStartWith('use("Store");');
    expect(mongo).toContain('"required": [\n        "product_id"\n      ]');
    expect(mongo).toContain(
      'db.getCollection("reviews").createIndex({"product_id":1,"posted_at":-1});',
    );
  });
});
