import { type DesignOp, migrateGraph } from "@repo/design";

import { type DesignRevisionRow, designRevisionsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { DesignRevisionEntity } from "../design-revision.entity";
import {
  type CreateDesignRevisionData,
  DesignRevisionsRepository,
} from "../ports/design-revisions.repository";

const toEntity = (row: DesignRevisionRow): DesignRevisionEntity => ({
  ...row,
  ops: row.ops as DesignOp[],
  inverse: row.inverse as DesignOp[],
  snapshot: row.snapshot === null ? null : migrateGraph(row.snapshot),
});

export class PostgresDesignRevisionsRepository extends DesignRevisionsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(
    data: CreateDesignRevisionData,
  ): Promise<DesignRevisionEntity> {
    const [row] = await this.db
      .insert(designRevisionsSchema)
      .values(data)
      .returning();

    return toEntity(row!);
  }
}
