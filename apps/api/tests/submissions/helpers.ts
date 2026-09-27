import { type DesignOp, OFFICIAL_PROBLEMS } from "@repo/design";
import type { TestClient } from "@tests/helpers";
import { expect } from "bun:test";

import { applyOps, type DesignBody } from "../designs/helpers";

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;
const PATH = "/api/problems/url-shortener";

export interface Attempt {
  designId: string;
  problemVersion: number;
}

export const start = async (user: TestClient) =>
  (await user.post<Attempt>(`${PATH}/start`)).body;

export const buildReference = async (user: TestClient, attempt: Attempt) => {
  const design = await user.get<DesignBody>(`/api/designs/${attempt.designId}`);
  const present = new Set(design.body.graph.nodes.map((node) => node.id));
  const ops: DesignOp[] = [
    ...shortener.reference.graph.nodes
      .filter((node) => !present.has(node.id))
      .map((node): DesignOp => ({ op: "add-node", node })),
    ...shortener.reference.graph.edges.map((edge): DesignOp => ({
      op: "add-edge",
      edge,
    })),
  ];
  const applied = await applyOps(
    user,
    attempt.designId,
    design.body.revision,
    ops,
  );

  expect(applied.status).toBe(200);

  return applied.body.revision;
};
