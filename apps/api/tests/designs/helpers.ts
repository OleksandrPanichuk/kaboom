import type { DesignGraph } from "@repo/design";
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
