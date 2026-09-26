import type { DesignGraph, DesignOp } from "@repo/design";

import type { DesignRevisionAuthor } from "@/db";

import type {
  DesignRevisionModel,
  DesignRevisionSummaryModel,
} from "./design.model";

export interface DesignRevisionEntity {
  id: string;
  designId: string;
  number: number;
  author: DesignRevisionAuthor;
  ops: DesignOp[];
  inverse: DesignOp[];
  snapshot: DesignGraph | null;
  graphHash: string;
  createdAt: Date;
}

export interface DesignRevisionGraph {
  revision: DesignRevisionEntity;
  graph: DesignGraph;
}

export class DesignRevisionEntity {
  public static normalizeSummary(
    entity: DesignRevisionEntity,
  ): DesignRevisionSummaryModel {
    return {
      number: entity.number,
      author: entity.author,
      opCount: entity.ops.length,
      graphHash: entity.graphHash,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  public static normalize({
    revision,
    graph,
  }: DesignRevisionGraph): DesignRevisionModel {
    return {
      ...DesignRevisionEntity.normalizeSummary(revision),
      ops: revision.ops,
      graph,
    };
  }
}
