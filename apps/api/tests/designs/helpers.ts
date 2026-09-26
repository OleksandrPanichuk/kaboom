import type { DesignGraph, DesignOp } from "@repo/design";
import type { TestClient } from "@tests/helpers";

export const PATH = "/api/designs";

export interface DesignBody {
  id: string;
  name: string;
  graph: DesignGraph;
  layout: Record<string, { x: number; y: number }>;
  revision: number;
  graphHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppliedBody {
  revision: number;
  graph: DesignGraph;
  graphHash: string;
}

export interface ErrorBody {
  code: string;
  error: string;
  details?: Record<string, unknown>;
}

export const createDesign = async (
  client: TestClient,
  name = "Sandbox",
): Promise<DesignBody> => {
  const response = await client.post<DesignBody>(PATH, { name });

  if (response.status !== 200) {
    throw new Error(`createDesign failed: ${response.status}`);
  }

  return response.body;
};

export const applyOps = (
  client: TestClient,
  id: string,
  baseRevision: number,
  ops: DesignOp[] | unknown[],
) =>
  client.post<AppliedBody & ErrorBody>(`${PATH}/${id}/ops`, {
    baseRevision,
    ops,
  });
