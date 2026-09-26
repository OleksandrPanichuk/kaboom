import { type DesignOp, migrateGraph } from "@repo/design";
import { and, asc, eq, lte } from "drizzle-orm";

import type { Page, PageRequest } from "@/core/pagination";
import { type DesignRevisionRow, designRevisionsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { Keyset } from "@/db/pagination";

import type { DesignRevisionEntity } from "../design-revision.entity";
import {
  type CreateDesignRevisionData,
  DesignRevisionsRepository,
} from "../ports/design-revisions.repository";

const NEWEST_FIRST = new Keyset<DesignRevisionEntity>({
  sort: designRevisionsSchema.number,
  id: designRevisionsSchema.id,
  direction: "desc",
  key: (revision) => [revision.number, revision.id],
});

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

  public async list(
    designId: string,
    page: PageRequest,
  ): Promise<Page<DesignRevisionEntity>> {
    const rows = await this.db
      .select()
      .from(designRevisionsSchema)
      .where(
        and(
          eq(designRevisionsSchema.designId, designId),
          NEWEST_FIRST.after(page.cursor),
        ),
      )
      .orderBy(...NEWEST_FIRST.orderBy())
      .limit(NEWEST_FIRST.limit(page));

    return NEWEST_FIRST.page(rows.map(toEntity), page);
  }

  public async listThrough(
    designId: string,
    number: number,
  ): Promise<DesignRevisionEntity[]> {
    const rows = await this.db
      .select()
      .from(designRevisionsSchema)
      .where(
        and(
          eq(designRevisionsSchema.designId, designId),
          lte(designRevisionsSchema.number, number),
        ),
      )
      .orderBy(asc(designRevisionsSchema.number));

    return rows.map(toEntity);
  }
}
