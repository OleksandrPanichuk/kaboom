import { describe, expect, test } from "bun:test";

import { createNode, type DesignNode } from "../graph";
import { catalogue, isNodeKind, NODE_KINDS } from "./catalogue";

describe("catalogue", () => {
  test("keys every definition by its own kind", () => {
    for (const [key, definition] of Object.entries(catalogue)) {
      expect<string>(definition.kind).toBe(key);
    }
  });

  test.each(NODE_KINDS)("gives %s a complete set of defaults", (kind) => {
    const props = catalogue[kind].props.parse({});

    expect(catalogue[kind].props.parse(props)).toEqual(props);
  });

  test.each(NODE_KINDS)("refuses an unknown prop on %s", (kind) => {
    expect(catalogue[kind].props.safeParse({ typo: 1 }).success).toBe(false);
  });

  test.each(NODE_KINDS)("documents %s for the handbook", (kind) => {
    const { docs } = catalogue[kind];
    const sentences = [docs.summary, docs.useWhen, ...docs.pitfalls];

    expect(docs.summary.length).toBeLessThanOrEqual(120);
    expect(docs.pitfalls.length).toBeLessThanOrEqual(4);
    for (const sentence of sentences) {
      expect(sentence).toMatch(/^[A-Z].*\.$/);
    }
  });

  test("tells a known kind from anything else", () => {
    expect(isNodeKind("service")).toBe(true);
    expect(isNodeKind("toString")).toBe(false);
    expect(isNodeKind(42)).toBe(false);
  });

  test("narrows props by kind", () => {
    const nodes: DesignNode[] = [
      createNode("service", { id: "api" }),
      createNode("cache", { id: "redis" }),
    ];

    const replicas = nodes.map((node) =>
      node.kind === "service" ? node.props.replicas : null,
    );

    const cacheHasNoReplicas: "replicas" extends keyof Extract<
      DesignNode,
      { kind: "cache" }
    >["props"]
      ? false
      : true = true;

    expect(replicas).toEqual([2, null]);
    expect(cacheHasNoReplicas).toBe(true);
  });
});
