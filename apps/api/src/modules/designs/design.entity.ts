import type { DesignGraph } from "@repo/design";

import type { DesignModel, DesignSummaryModel } from "./design.model";

export type DesignLayout = Record<string, { x: number; y: number }>;

export interface DesignEntity {
  id: string;
  ownerId: string;
  name: string;
  graph: DesignGraph;
  layout: DesignLayout;
  revision: number;
  graphHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DesignSummaryEntity = Pick<
  DesignEntity,
  "id" | "name" | "revision" | "createdAt" | "updatedAt"
>;

export class DesignEntity {
  public static normalize(entity: DesignEntity): DesignModel {
    return {
      id: entity.id,
      name: entity.name,
      graph: entity.graph,
      layout: entity.layout,
      revision: entity.revision,
      graphHash: entity.graphHash,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  public static normalizeSummary(
    entity: DesignSummaryEntity,
  ): DesignSummaryModel {
    return {
      id: entity.id,
      name: entity.name,
      revision: entity.revision,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
