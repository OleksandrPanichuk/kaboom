import type { DesignGraph, DesignNode } from "@repo/design";
import { column, index, references, table } from "@repo/design/build";
import { scoreSubmission } from "@repo/scoring";
import { describe, expect, test } from "bun:test";

import { OFFICIAL_PROBLEMS } from ".";

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

describe("sign-up and an audit log", () => {
  const reference = problem("signup-audit").reference.graph;
  const column = (graph: DesignGraph, tableId: string, name: string) =>
    (
      graph.nodes.find((node) => node.id === tableId) as Table
    ).props.columns.find((item) => item.name === name)!;

  test("catches an email of any length, and a lookup that minds the case", () => {
    const unbounded = edit(reference, "accounts", (accounts) => {
      const email = accounts.props.columns.find(
        (item) => item.name === "email",
      )!;

      delete email.length;
      email.type = "text";
    });
    const exact = edit(reference, "accounts", (accounts) => {
      accounts.props.indexes = [
        { id: "email_idx", columns: ["email"], unique: true },
      ];
    });

    expect(failing("signup-audit", unbounded)).toEqual(["sign-up"]);
    expect(failing("signup-audit", exact)).toEqual(["sign-up"]);
  });

  test("catches ids and dates the application has to send", () => {
    const manual = edit(reference, "audit_events", (events) => {
      delete events.props.columns[0]!.generated;
      delete events.props.columns.at(-1)!.default;
    });

    expect(failing("signup-audit", manual)).toEqual(["audit"]);
    expect(column(reference, "accounts", "id").generated).toEqual({
      kind: "identity",
      always: true,
    });
  });

  test("catches a status that takes any word", () => {
    const loose = edit(reference, "accounts", (accounts) => {
      const status = accounts.props.columns.find(
        (item) => item.name === "status",
      )!;

      status.type = "text";
      delete status.values;
      delete status.default;
    });

    expect(failing("signup-audit", loose)).toEqual(["statuses"]);
  });
});

describe("a job queue in a table", () => {
  const reference = problem("job-queue").reference.graph;

  test("catches a poll index that holds every finished job", () => {
    const unfiltered = edit(reference, "jobs", (jobs) => {
      jobs.props.indexes = jobs.props.indexes.map((index) =>
        index.id === "pending_idx"
          ? { id: index.id, columns: index.columns, unique: false }
          : index,
      );
    });
    const leadingStatus = edit(reference, "jobs", (jobs) => {
      jobs.props.indexes = jobs.props.indexes.map((index) =>
        index.id === "pending_idx"
          ? {
              id: index.id,
              columns: ["status", "queue", "run_at"],
              unique: false,
            }
          : index,
      );
    });

    expect(failing("job-queue", unfiltered)).toEqual(["next-job"]);
    expect(failing("job-queue", leadingStatus)).toEqual([]);
  });

  test("catches payloads kept as json, or searched without a GIN index", () => {
    const json = edit(reference, "jobs", (jobs) => {
      jobs.props.columns.find((item) => item.name === "payload")!.type = "json";
    });
    const unindexed = edit(reference, "jobs", (jobs) => {
      jobs.props.indexes = jobs.props.indexes.filter(
        (index) => index.method !== "gin",
      );
    });

    expect(failing("job-queue", json)).toEqual(["payload-search"]);
    expect(failing("job-queue", unindexed)).toEqual(["payload-search"]);
  });
});

describe("product search on MySQL", () => {
  const reference = problem("product-search").reference.graph;

  test("catches a price that rounds", () => {
    const floating = edit(reference, "products", (products) => {
      const price = products.props.columns.find(
        (item) => item.name === "price",
      )!;

      price.type = "double";
      delete price.precision;
      delete price.scale;
    });

    expect(failing("product-search", floating)).toEqual(["browse"]);
  });

  test("catches a search box without a full-text index", () => {
    const plain = edit(reference, "products", (products) => {
      products.props.indexes = products.props.indexes.map((index) =>
        index.method === "fulltext"
          ? { id: index.id, columns: index.columns, unique: false }
          : index,
      );
    });

    expect(failing("product-search", plain)).toEqual(["search"]);
  });

  test("catches PostgreSQL habits MySQL does not have", () => {
    const jsonb = edit(reference, "products", (products) => {
      products.props.columns.find((item) => item.name === "attributes")!.type =
        "jsonb";
    });
    const unsized = edit(reference, "categories", (categories) => {
      delete categories.props.columns.find((item) => item.name === "name")!
        .length;
    });

    expect(failing("product-search", jsonb)).toEqual(["mysql-only"]);
    expect(failing("product-search", unsized)).toEqual(["mysql-only"]);
  });
});

type Collection = Extract<DesignNode, { kind: "collection" }>;

const editCollection = (
  graph: DesignGraph,
  collectionId: string,
  change: (collection: Collection) => void,
): DesignGraph => {
  const copy = structuredClone(graph);

  change(copy.nodes.find((node) => node.id === collectionId) as Collection);

  return copy;
};

describe("a product catalogue with variants", () => {
  const reference = problem("catalogue-variants").reference.graph;

  test("catches variants kept as ids of documents elsewhere", () => {
    const referenced = editCollection(reference, "products", (products) => {
      const variants = products.props.fields.find(
        (item) => item.name === "variants",
      )!;

      variants.of = "objectId";
      delete variants.fields;
    });

    expect(failing("catalogue-variants", referenced)).toEqual(["product-page"]);
  });

  test("catches a product that keeps the ids of its reviews", () => {
    const hoarding: DesignGraph = {
      ...editCollection(reference, "products", (products) => {
        products.props.fields.push({
          id: "review_ids",
          name: "review_ids",
          type: "array",
          of: "objectId",
          required: false,
        });
      }),
    };

    hoarding.edges = [
      ...hoarding.edges,
      {
        ...hoarding.edges[0]!,
        id: "products-review_ids-ref",
        from: "products",
        to: "reviews",
        reference: { fromField: ["review_ids"] },
      },
    ];

    expect(failing("catalogue-variants", hoarding)).toEqual([
      "product-page",
      "browsing",
      "reviews-scale",
    ]);
  });

  test("catches indexes whose keys are not equality, then sort", () => {
    const backwards = editCollection(reference, "reviews", (reviews) => {
      reviews.props.indexes = [
        {
          id: "wrong",
          keys: [
            { path: ["posted_at"], direction: "desc" },
            { path: ["product_id"], direction: "asc" },
          ],
          unique: false,
        },
      ];
    });

    expect(failing("catalogue-variants", backwards)).toEqual(["browsing"]);
  });
});

describe("chat messages in MongoDB", () => {
  const reference = problem("chat-messages").reference.graph;

  test("catches a chat that embeds its messages", () => {
    const embedded = editCollection(reference, "chats", (chats) => {
      chats.props.fields.push({
        id: "messages",
        name: "messages",
        type: "array",
        of: "object",
        required: false,
        fields: [{ id: "body", name: "body", type: "string", required: false }],
      });
    });

    expect(failing("chat-messages", embedded)).toEqual([
      "history",
      "presence",
      "mentions",
    ]);
  });

  test("catches typing signals nobody deletes, and mentions found by scanning", () => {
    const lingering = editCollection(reference, "typing", (typing) => {
      typing.props.indexes = [];
    });
    const scanned = editCollection(reference, "messages", (messages) => {
      messages.props.indexes = messages.props.indexes.filter(
        (index) => index.id !== "mentions_idx",
      );
    });

    expect(failing("chat-messages", lingering)).toEqual(["presence"]);
    expect(failing("chat-messages", scanned)).toEqual(["mentions"]);
  });
});

type DynamoTable = Extract<DesignNode, { kind: "dynamo-table" }>;

const editDynamo = (
  graph: DesignGraph,
  tableId: string,
  change: (table: DynamoTable) => void,
): DesignGraph => {
  const copy = structuredClone(graph);

  change(copy.nodes.find((node) => node.id === tableId) as DynamoTable);

  return copy;
};

const itemOf = (table: DynamoTable, name: string) =>
  table.props.items.find((item) => item.name === name)!;

describe("orders in one DynamoDB table", () => {
  const reference = problem("orders-one-table").reference.graph;

  test("catches order lines kept as a list inside the order", () => {
    const embedded = editDynamo(reference, "shop", (shop) => {
      shop.props.items = shop.props.items.filter(
        (item) => item.name !== "OrderLine",
      );
      itemOf(shop, "Order").attributes.push({
        id: "lines",
        name: "lines",
        type: "L",
      });
    });

    expect(failing("orders-one-table", embedded)).toEqual(["order-page"]);
  });

  test("catches orders kept only in a partition of their own", () => {
    const apart = editDynamo(reference, "shop", (shop) => {
      const order = itemOf(shop, "Order");

      order.keys = { ...order.keys, PK: "ORDER#{orderId}", SK: "ORDER" };
    });

    expect(failing("orders-one-table", apart)).toEqual(["customer-page"]);
  });

  test("catches a status index that runs hot or carries too little", () => {
    const unsharded = editDynamo(reference, "shop", (shop) => {
      const order = itemOf(shop, "Order");

      order.attributes = order.attributes.filter(
        (attribute) => attribute.name !== "shard",
      );
      order.keys = { ...order.keys, GSI2PK: "STATUS#{status}" };
    });
    const keysOnly = editDynamo(reference, "shop", (shop) => {
      const gsi2 = shop.props.indexes.find((index) => index.name === "GSI2")!;

      gsi2.projection = "keys-only";
      delete gsi2.include;
    });

    expect(failing("orders-one-table", unsharded)).toEqual(["sale-peak"]);
    expect(failing("orders-one-table", keysOnly)).toEqual([
      "status-board",
      "sale-peak",
    ]);
  });

  test("does not take a random suffix for shards", () => {
    const random = editDynamo(reference, "shop", (shop) => {
      const shard = itemOf(shop, "Order").attributes.find(
        (attribute) => attribute.name === "shard",
      )!;

      delete shard.shards;
    });

    expect(failing("orders-one-table", random)).toEqual([
      "status-board",
      "sale-peak",
    ]);
  });
});

describe("a game leaderboard in DynamoDB", () => {
  const reference = problem("game-leaderboard").reference.graph;

  test("catches a ranking index with one partition a board", () => {
    const unsharded = editDynamo(reference, "scores", (scores) => {
      const score = itemOf(scores, "Score");

      score.keys = { ...score.keys, GSI1PK: "BOARD#{boardId}" };
    });

    expect(failing("game-leaderboard", unsharded)).toEqual(["launch-day"]);
  });

  test("catches a board read by scanning, and scores that never expire", () => {
    const scanned = editDynamo(reference, "scores", (scores) => {
      scores.props.indexes = [];
      scores.props.keySchema.attributes =
        scores.props.keySchema.attributes.slice(0, 2);
      for (const item of scores.props.items) {
        delete item.keys.GSI1PK;
        delete item.keys.GSI1SK;
      }
    });
    const lasting = editDynamo(reference, "scores", (scores) => {
      scores.props.ttlAttribute = "";
    });

    expect(failing("game-leaderboard", scanned)).toEqual([
      "top-of-board",
      "launch-day",
    ]);
    expect(failing("game-leaderboard", lasting)).toEqual(["daily-boards"]);
  });
});

describe("checkout under a flash sale", () => {
  const reference = problem("flash-sale-checkout").reference.graph;

  test("catches a service that connects to the database itself", () => {
    const direct: DesignGraph = {
      ...reference,
      nodes: reference.nodes.filter((node) => node.id !== "pooler"),
      edges: [
        ...reference.edges.filter(
          (edge) => edge.from !== "pooler" && edge.to !== "pooler",
        ),
        {
          id: "direct",
          from: "checkout",
          to: "orders-db",
          kind: "sync-call",
          label: "",
          props: { share: 1, fanOut: 1, timeoutMs: 1_000, retries: 0 },
        },
      ],
    };

    expect(failing("flash-sale-checkout", direct)).toEqual([
      "survives-the-sale",
      "pools-connections",
    ]);
  });

  test("catches a pooler whose own pool is too small for the sale", () => {
    const starved: DesignGraph = {
      ...reference,
      edges: reference.edges.map((edge) =>
        edge.from === "pooler"
          ? { ...edge, connection: { poolSize: 10 } }
          : edge,
      ),
    };

    expect(failing("flash-sale-checkout", starved)).toEqual([
      "survives-the-sale",
    ]);
  });

  test("catches a product's orders read without an index, and nothing else", () => {
    const unindexed = edit(reference, "order_lines", (lines) => {
      lines.props.indexes = [];
    });

    expect(failing("flash-sale-checkout", unindexed)).toEqual(["sales-report"]);
  });
});
