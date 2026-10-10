import { createNode, emptyGraph } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { describeConnectionRefusal } from "./describeConnectionRefusal";

const graph = {
  ...emptyGraph(),
  nodes: [
    createNode("load-balancer", { id: "lb", label: "Edge LB" }),
    createNode("service", { id: "api", label: "API" }),
  ],
};

const refusal = (reason: "load-cycle" | "invalid-edge", message = "") => ({
  ok: false as const,
  index: 0,
  reason,
  message,
});

describe("describeConnectionRefusal", () => {
  test("names both nodes when the edge would close a loop", () => {
    expect(
      describeConnectionRefusal(graph, "api", "lb", refusal("load-cycle")),
    ).toBe(
      "Edge LB already sends load on to API, so this connection would make a loop.",
    );
  });

  test("explains a duplicate and a self-connection", () => {
    expect(
      describeConnectionRefusal(
        graph,
        "lb",
        "api",
        refusal(
          "invalid-edge",
          "A sync-call edge from lb to api already exists",
        ),
      ),
    ).toBe("Edge LB is already connected to API this way.");
    expect(
      describeConnectionRefusal(
        graph,
        "api",
        "api",
        refusal("invalid-edge", "Edge e1 connects api to itself"),
      ),
    ).toBe("A node cannot connect to itself.");
    expect(
      describeConnectionRefusal(
        {
          ...graph,
          nodes: [
            ...graph.nodes,
            createNode("client", { id: "web", label: "Browsers" }),
          ],
        },
        "api",
        "web",
        refusal(
          "invalid-edge",
          "Edge e1 ends at web, a client; clients send requests and nothing calls them",
        ),
      ),
    ).toBe(
      "Browsers is a client: clients only send requests, so nothing connects into one.",
    );
    expect(
      describeConnectionRefusal(
        graph,
        "lb",
        "api",
        refusal(
          "invalid-edge",
          "Edge e1 replicates load-balancer to service; replication joins two stores of one replicable kind",
        ),
      ),
    ).toBe(
      "Replication joins two stores of the same kind, such as two SQL databases.",
    );
  });
});
