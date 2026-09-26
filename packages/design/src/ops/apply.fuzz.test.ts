import { describe, expect, test } from "bun:test";

import { carriesLoad, EDGE_KINDS, NODE_KINDS } from "../catalogue";
import {
  canonicalize,
  createEdge,
  createGroup,
  createNode,
  type DesignGraph,
  emptyGraph,
} from "../graph";
import { applyOps } from "./apply";
import type { DesignOp } from "./schema";

const RUNS = 300;
const BATCHES_PER_RUN = 12;

const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);

  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};

const generator = (seed: number) => {
  const random = mulberry32(seed);
  let counter = 0;

  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(random() * items.length)]!;

  const existing = (graph: DesignGraph): string[] => [
    ...graph.nodes.map((node) => node.id),
    ...graph.edges.map((edge) => edge.id),
    ...graph.groups.map((group) => group.id),
    "ghost",
  ];

  const op = (graph: DesignGraph): DesignOp => {
    const ids = existing(graph);
    const nodeIds = [...graph.nodes.map((node) => node.id), "ghost"];
    const groupIds = [...graph.groups.map((group) => group.id), null];

    switch (Math.floor(random() * 8)) {
      case 0:
        return {
          op: "add-node",
          node: createNode(pick(NODE_KINDS), {
            id: random() < 0.1 ? pick(ids) : `n${counter++}`,
            groupId: pick(groupIds),
          }),
        };
      case 1:
        return { op: "remove-node", id: pick(nodeIds) };
      case 2:
        return {
          op: "update-node",
          id: pick(nodeIds),
          patch: {
            label: `label ${counter++}`,
            ...(random() < 0.5 ? { groupId: pick(groupIds) } : {}),
            ...(random() < 0.5
              ? { props: { baseLatencyMs: Math.floor(random() * 100) } }
              : {}),
          },
        };
      case 3:
      case 4:
        return {
          op: "add-edge",
          edge: createEdge({
            id: `e${counter++}`,
            from: pick(nodeIds),
            to: pick(nodeIds),
            kind: pick(EDGE_KINDS),
          }),
        };
      case 5:
        return {
          op: "update-edge",
          id: pick([...graph.edges.map((edge) => edge.id), "ghost"]),
          patch: {
            kind: pick(EDGE_KINDS),
            props: { share: Math.round(random() * 100) / 100 },
          },
        };
      case 6:
        return {
          op: "add-group",
          group: createGroup({
            id: `g${counter++}`,
            kind: "region",
            label: "Region",
            parentId: pick(groupIds),
          }),
        };
      default:
        return random() < 0.5
          ? {
              op: "remove-edge",
              id: pick([...graph.edges.map((edge) => edge.id), "ghost"]),
            }
          : {
              op: "remove-group",
              id: pick([...graph.groups.map((group) => group.id), "ghost"]),
            };
    }
  };

  const batch = (graph: DesignGraph): DesignOp[] =>
    Array.from({ length: 1 + Math.floor(random() * 4) }, () => op(graph));

  return { batch };
};

const assertInvariants = (graph: DesignGraph): void => {
  const ids = [
    ...graph.nodes.map((node) => node.id),
    ...graph.edges.map((edge) => edge.id),
    ...graph.groups.map((group) => group.id),
  ];

  expect(new Set(ids).size).toBe(ids.length);

  const nodes = new Set(graph.nodes.map((node) => node.id));
  const groups = new Set(graph.groups.map((group) => group.id));

  for (const edge of graph.edges) {
    expect(nodes.has(edge.from) && nodes.has(edge.to)).toBe(true);
  }

  for (const node of graph.nodes) {
    expect(node.groupId === null || groups.has(node.groupId)).toBe(true);
  }

  const visiting = new Set<string>();
  const done = new Set<string>();

  const visit = (id: string): void => {
    if (done.has(id)) return;

    expect(visiting.has(id)).toBe(false);
    visiting.add(id);

    for (const edge of graph.edges) {
      if (edge.from === id && carriesLoad(edge.kind)) visit(edge.to);
    }

    visiting.delete(id);
    done.add(id);
  };

  for (const id of nodes) visit(id);
};

describe("applyOps under random batches", () => {
  test(`keeps its invariants and undoes exactly, over ${RUNS} seeded runs`, () => {
    let accepted = 0;

    for (let seed = 1; seed <= RUNS; seed++) {
      const { batch } = generator(seed);
      let graph = emptyGraph();

      for (let step = 0; step < BATCHES_PER_RUN; step++) {
        const ops = batch(graph);
        const before = canonicalize(graph);
        const result = applyOps(graph, ops);

        expect(canonicalize(graph)).toBe(before);

        if (!result.ok) continue;

        accepted++;
        assertInvariants(result.graph);

        const undone = applyOps(result.graph, result.inverse);

        if (!undone.ok) {
          throw new Error(
            `seed ${seed}, step ${step}: inverse refused (${undone.reason}: ${undone.message})`,
          );
        }

        expect(canonicalize(undone.graph)).toBe(before);

        graph = result.graph;
      }
    }

    expect(accepted).toBeGreaterThan(RUNS);
  });
});
