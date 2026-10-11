import type { DesignGraph } from "@repo/design";

import type { DesignKind } from "@/db";

import type { DesignModel, DesignSummaryModel } from "./design.model";

export type DesignLayout = Record<string, { x: number; y: number }>;

export interface DesignEntity {
  id: string;
  ownerId: string;
  name: string;
  kind: DesignKind;
  graph: DesignGraph;
  layout: DesignLayout;
  revision: number;
  graphHash: string;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedSchema {
  designId: string;
  revision: number;
  graphHash: string;
  graph: DesignGraph;
}

export type DesignSummaryEntity = Pick<
  DesignEntity,
  "id" | "name" | "kind" | "revision" | "createdAt" | "updatedAt"
>;

export class DesignEntity {
  public static normalize(entity: DesignEntity): DesignModel {
    return {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      graph: entity.graph,
      layout: entity.layout,
      revision: entity.revision,
      graphHash: entity.graphHash,
      locked: entity.lockedAt !== null,
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
      kind: entity.kind,
      revision: entity.revision,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
