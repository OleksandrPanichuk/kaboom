import { applyOps, type DesignGraph } from "@repo/design";

import { hashGraph } from "./design.hash";
import type { DesignRevisionEntity } from "./design-revision.entity";

export class DesignReplayError extends Error {
  public override readonly name = "DesignReplayError";
}

export const replayRevisions = (
  revisions: readonly DesignRevisionEntity[],
): DesignGraph => {
  const [first, ...rest] = revisions;

  if (!first?.snapshot) {
    throw new DesignReplayError("A replay has to start from a snapshot");
  }

  let graph = first.snapshot;

  for (const revision of rest) {
    const result = applyOps(graph, revision.ops);

    if (!result.ok) {
      throw new DesignReplayError(
        `Revision ${revision.number} of design ${revision.designId} no longer applies: ${result.reason}`,
      );
    }

    graph = result.graph;
  }

  const last = revisions.at(-1)!;

  if (hashGraph(graph) !== last.graphHash) {
    throw new DesignReplayError(
      `Revision ${last.number} of design ${last.designId} replays to a different graph than it stored`,
    );
  }

  return graph;
};
