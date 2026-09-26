import type { DesignGraph, DesignOp } from "@repo/design";

import { Repository } from "@/core/repository";
import type { DesignRevisionAuthor } from "@/db";

import type { DesignRevisionEntity } from "../design-revision.entity";

export interface CreateDesignRevisionData {
  designId: string;
  number: number;
  author: DesignRevisionAuthor;
  ops: DesignOp[];
  inverse: DesignOp[];
  snapshot: DesignGraph | null;
  graphHash: string;
}

export abstract class DesignRevisionsRepository extends Repository {
  public abstract insert(
    data: CreateDesignRevisionData,
  ): Promise<DesignRevisionEntity>;
}
