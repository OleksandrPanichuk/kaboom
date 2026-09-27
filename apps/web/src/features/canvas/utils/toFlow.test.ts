import { createNode, emptyGraph } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { toFlow } from "./toFlow";

const graphWith = (ids: string[]) => ({
  ...emptyGraph(),
  nodes: ids.map((id) => createNode("service", { id, label: id })),
});

describe("toFlow", () => {
  test("keeps the saved position of a node", () => {
    const { nodes } = toFlow(graphWith(["api"]), { api: { x: 40, y: 80 } });

    expect(nodes[0]?.position).toEqual({ x: 40, y: 80 });
  });

  test("places nodes without a position on a grid, in order", () => {
    const { nodes } = toFlow(graphWith(["a", "b", "c", "d", "e"]), {
      b: { x: 999, y: 999 },
    });

    expect(nodes.map((node) => node.position)).toEqual([
      { x: 0, y: 0 },
      { x: 999, y: 999 },
      { x: 280, y: 0 },
      { x: 560, y: 0 },
      { x: 840, y: 0 },
    ]);
  });

  test("maps edges to their endpoints and styles them by kind", () => {
    const graph = {
      ...graphWith(["api", "db"]),
      edges: [
        {
          id: "e1",
          from: "api",
          to: "db",
          kind: "async-message" as const,
          label: "",
          props: { share: 1, fanOut: 1, timeoutMs: 1_000 },
        },
      ],
    };
    const [edge] = toFlow(graph, {}).edges;

    expect(edge).toMatchObject({
      source: "api",
      target: "db",
      animated: true,
      label: undefined,
    });
  });
});
