import type { DesignGraph, DesignOp } from "@repo/design";

import type { DesignRevisionAuthor } from "@/db";

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
