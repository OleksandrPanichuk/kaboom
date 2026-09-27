import type { DesignGraph } from "@repo/design";

import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";

import type {
  DesignEntity,
  DesignLayout,
  DesignSummaryEntity,
} from "../design.entity";

export interface CreateDesignData {
  ownerId: string;
  name: string;
  graph: DesignGraph;
  graphHash: string;
}

export interface UpdateDesignData {
  name?: string;
}

export interface SaveDesignGraphData {
  graph: DesignGraph;
  revision: number;
  graphHash: string;
}

export abstract class DesignsRepository extends Repository {
  public abstract insert(data: CreateDesignData): Promise<DesignEntity>;

  public abstract listOwned(
    ownerId: string,
    page: PageRequest,
  ): Promise<Page<DesignSummaryEntity>>;

  public abstract findOwned(
    id: string,
    ownerId: string,
  ): Promise<DesignEntity | null>;

  public abstract lockOwned(
    id: string,
    ownerId: string,
  ): Promise<DesignEntity | null>;

  public abstract existsOwned(id: string, ownerId: string): Promise<boolean>;

  public abstract updateOwned(
    id: string,
    ownerId: string,
    data: UpdateDesignData,
  ): Promise<DesignEntity | null>;

  public abstract saveGraph(
    id: string,
    data: SaveDesignGraphData,
  ): Promise<DesignEntity>;

  public abstract saveLayout(
    id: string,
    ownerId: string,
    layout: DesignLayout,
  ): Promise<boolean>;

  public abstract deleteOwned(id: string, ownerId: string): Promise<boolean>;

  public abstract lock(id: string): Promise<void>;
}
