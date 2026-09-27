import { createNode, emptyGraph } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { newNode, uniqueLabel } from "./newNode";

const graphWith = (labels: string[]) => ({
  ...emptyGraph(),
  nodes: labels.map((label, index) =>
    createNode("service", { id: `n${index}`, label }),
  ),
});

describe("newNode", () => {
  test("labels a node after its kind, numbering repeats", () => {
    expect(uniqueLabel(graphWith([]), "Service")).toBe("Service");
    expect(uniqueLabel(graphWith(["Service"]), "Service")).toBe("Service 2");
    expect(uniqueLabel(graphWith(["Service", "Service 2"]), "Service")).toBe(
      "Service 3",
    );
  });

  test("gives each node a fresh id prefixed with its kind", () => {
    const first = newNode(emptyGraph(), "cache");
    const second = newNode(emptyGraph(), "cache");

    expect(first.id).toMatch(/^cache-[0-9a-f]{8}$/);
    expect(first.id).not.toBe(second.id);
    expect(first.label).toBe("Cache");
  });
});
