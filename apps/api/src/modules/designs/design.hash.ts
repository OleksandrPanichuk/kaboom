import { createHash } from "node:crypto";

import { canonicalize, type DesignGraph } from "@repo/design";

export const hashGraph = (graph: DesignGraph): string =>
  createHash("sha256").update(canonicalize(graph)).digest("hex");
