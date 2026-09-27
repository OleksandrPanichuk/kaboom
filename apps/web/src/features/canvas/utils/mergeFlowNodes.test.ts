import { createNode } from "@repo/design";
import { describe, expect, test } from "bun:test";

import type { CanvasNode } from "@/features/canvas/typedefs";

import { mergeFlowNodes } from "./mergeFlowNodes";

const flowNode = (id: string, x: number, extra: Partial<CanvasNode> = {}) =>
  ({
    id,
    type: "design-node",
    position: { x, y: 0 },
    data: { node: createNode("service", { id }), hits: [] },
    ...extra,
  }) as CanvasNode;

describe("mergeFlowNodes", () => {
  test("keeps what React Flow measured and selected, and takes the new position", () => {
    const [merged] = mergeFlowNodes(
      [
        flowNode("a", 0, {
          selected: true,
          measured: { width: 208, height: 58 },
        }),
      ],
      [flowNode("a", 100)],
    );

    expect(merged).toMatchObject({
      selected: true,
      measured: { width: 208, height: 58 },
      position: { x: 100, y: 0 },
    });
  });

  test("leaves a node that is being dragged where the pointer has it", () => {
    const [merged] = mergeFlowNodes(
      [flowNode("a", 42, { dragging: true })],
      [flowNode("a", 0)],
    );

    expect(merged?.position).toEqual({ x: 42, y: 0 });
  });

  test("adds new nodes and drops removed ones", () => {
    const merged = mergeFlowNodes([flowNode("gone", 0)], [flowNode("new", 0)]);

    expect(merged.map((node) => node.id)).toEqual(["new"]);
  });
});
