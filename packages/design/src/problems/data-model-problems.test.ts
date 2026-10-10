import { describe, expect, test } from "bun:test";

import type { DesignGraph, DesignNode } from "../graph";
import { OFFICIAL_PROBLEMS } from "./library";
import { column, index, references, table } from "./library/build";
import { scoreSubmission } from "./score";

const problem = (slug: string) =>
  OFFICIAL_PROBLEMS.find((item) => item.slug === slug)!;

type Table = Extract<DesignNode, { kind: "table" }>;

const edit = (
  graph: DesignGraph,
  tableId: string,
  change: (table: Table) => void,
): DesignGraph => {
  const copy = structuredClone(graph);

  change(copy.nodes.find((node) => node.id === tableId) as Table);

  return copy;
};

const failing = (slug: string, graph: DesignGraph) =>
  scoreSubmission(problem(slug), graph)
    .items.filter((item) => !item.passed)
    .map((item) => item.key);

describe("blog with tags", () => {
  const reference = problem("blog-tags").reference.graph;

  test("catches a tag kept on the post instead of a junction table", () => {
    const shortcut: DesignGraph = {
      ...reference,
      nodes: [...reference.nodes.filter((node) => node.id !== "post_tags")].map(
        (node) =>
          node.id === "posts"
            ? table(
                "posts",
                [
                  ...(node as Table).props.columns,
                  column("tag_id", "bigint", "null"),
                ],
                [...(node as Table).props.indexes, index(["tag_id"])],
              )
            : node,
      ),
      edges: [
        references("posts", "author_id", "users"),
        references("posts", "tag_id", "tags"),
      ],
    };

    expect(failing("blog-tags", shortcut)).toEqual(["tagging", "sound-keys"]);
  });

  test("catches a junction table that allows the same tag twice", () => {
    const loose = edit(reference, "post_tags", (junction) => {
      junction.props.columns = [
        column("id", "bigint", "key"),
        column("post_id", "bigint"),
        column("tag_id", "bigint"),
      ];
      junction.props.indexes = [index(["post_id"]), index(["tag_id"])];
    });

    expect(failing("blog-tags", loose)).toEqual(["tagging", "sound-keys"]);
  });

  test("catches an author's page that cannot be read newest first from an index", () => {
    const unordered = edit(reference, "posts", (posts) => {
      posts.props.indexes = [index(["author_id"])];
    });

    expect(failing("blog-tags", unordered)).toEqual(["authors"]);
  });

  test("catches a foreign key of another type than the key it references", () => {
    const narrow = edit(reference, "post_tags", (junction) => {
      junction.props.columns[1]!.type = "integer";
    });

    expect(failing("blog-tags", narrow)).toEqual(["sound-keys"]);
  });
});

describe("orders for an online shop", () => {
  const reference = problem("shop-orders").reference.graph;

  test("catches money kept in a type that rounds or may be missing", () => {
    const floating = edit(reference, "products", (products) => {
      products.props.columns[3]!.type = "integer";
    });
    const optional = edit(reference, "products", (products) => {
      products.props.columns[3]!.nullable = true;
    });

    expect(failing("shop-orders", floating)).toEqual(["catalogue"]);
    expect(failing("shop-orders", optional)).toEqual(["catalogue"]);
  });

  test("catches a sales report that reads every order line", () => {
    const unindexed = edit(reference, "order_items", (items) => {
      items.props.indexes = [];
    });

    expect(failing("shop-orders", unindexed)).toEqual(["sales-report"]);
  });

  test("catches an order history that is not ordered by an index", () => {
    const unordered = edit(reference, "orders", (orders) => {
      orders.props.indexes = [index(["placed_at"])];
    });

    expect(failing("shop-orders", unordered)).toEqual(["checkout"]);
  });
});

describe("meeting rooms for many companies", () => {
  const reference = problem("room-booking").reference.graph;

  test("catches a person tied to one tenant, with the role on the person", () => {
    const single: DesignGraph = {
      ...reference,
      nodes: reference.nodes
        .filter((node) => node.id !== "memberships")
        .map((node) =>
          node.id === "users"
            ? table(
                "users",
                [
                  ...(node as Table).props.columns,
                  column("tenant_id", "bigint"),
                  column("role", "text"),
                ],
                [index(["tenant_id"])],
              )
            : node,
        ),
      edges: [
        ...reference.edges.filter((edge) => edge.from !== "memberships"),
        references("users", "tenant_id", "tenants"),
      ],
    };

    expect(failing("room-booking", single)).toEqual(["people"]);
  });

  test("catches memberships indexed for only one direction", () => {
    const oneWay = edit(reference, "memberships", (memberships) => {
      memberships.props.indexes = [];
    });

    expect(failing("room-booking", oneWay)).toEqual(["people"]);
  });

  test("catches a tenant that could have two billing profiles", () => {
    const many = edit(reference, "billing_profiles", (profiles) => {
      profiles.props.columns[1]!.unique = false;
    });

    expect(failing("room-booking", many)).toEqual(["billing-and-bookings"]);
  });

  test("catches a person's bookings served by an index that leads with the room", () => {
    const wrongLead = edit(reference, "bookings", (bookings) => {
      bookings.props.indexes = [index(["room_id", "starts_at"])];
    });

    expect(failing("room-booking", wrongLead)).toEqual([
      "billing-and-bookings",
    ]);
  });
});
