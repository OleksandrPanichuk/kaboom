import { migrateGraph } from "@repo/design";
import { and, eq } from "drizzle-orm";

import type { Page, PageRequest } from "@/core/pagination";
import { type DesignRow, designsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { Keyset } from "@/db/pagination";

import type { DesignEntity, DesignSummaryEntity } from "../design.entity";
import { DesignNotFoundError } from "../designs.errors";
import {
  type CreateDesignData,
  DesignsRepository,
  type SaveDesignGraphData,
  type UpdateDesignData,
} from "../ports/designs.repository";

const NEWEST_FIRST = new Keyset<DesignSummaryEntity>({
  sort: designsSchema.createdAt,
  id: designsSchema.id,
  direction: "desc",
  key: (design) => [design.createdAt, design.id],
});

const toEntity = (row: DesignRow): DesignEntity => ({
  ...row,
  graph: migrateGraph(row.graph),
});

export class PostgresDesignsRepository extends DesignsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(data: CreateDesignData): Promise<DesignEntity> {
    const [row] = await this.db.insert(designsSchema).values(data).returning();

    return toEntity(row!);
  }

  public async listOwned(
    ownerId: string,
    page: PageRequest,
  ): Promise<Page<DesignSummaryEntity>> {
    const rows = await this.db
      .select({
        id: designsSchema.id,
        name: designsSchema.name,
        revision: designsSchema.revision,
        createdAt: designsSchema.createdAt,
        updatedAt: designsSchema.updatedAt,
      })
      .from(designsSchema)
      .where(
        and(
          eq(designsSchema.ownerId, ownerId),
          NEWEST_FIRST.after(page.cursor),
        ),
      )
      .orderBy(...NEWEST_FIRST.orderBy())
      .limit(NEWEST_FIRST.limit(page));

    return NEWEST_FIRST.page(rows, page);
  }

  public async findOwned(
    id: string,
    ownerId: string,
  ): Promise<DesignEntity | null> {
    const [row] = await this.db
      .select()
      .from(designsSchema)
      .where(this.owned(id, ownerId))
      .limit(1);

    return row ? toEntity(row) : null;
  }

  public async lockOwned(
    id: string,
    ownerId: string,
  ): Promise<DesignEntity | null> {
    const [row] = await this.db
      .select()
      .from(designsSchema)
      .where(this.owned(id, ownerId))
      .limit(1)
      .for("update");

    return row ? toEntity(row) : null;
  }

  public async updateOwned(
    id: string,
    ownerId: string,
    data: UpdateDesignData,
  ): Promise<DesignEntity | null> {
    const [row] = await this.db
      .update(designsSchema)
      .set({ ...data, updatedAt: new Date() })
      .where(this.owned(id, ownerId))
      .returning();

    return row ? toEntity(row) : null;
  }

  public async saveGraph(
    id: string,
    data: SaveDesignGraphData,
  ): Promise<DesignEntity> {
    const [row] = await this.db
      .update(designsSchema)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(designsSchema.id, id))
      .returning();

    if (!row) throw new DesignNotFoundError(`Design ${id} not found`);

    return toEntity(row);
  }

  public async deleteOwned(id: string, ownerId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(designsSchema)
      .where(this.owned(id, ownerId))
      .returning({ id: designsSchema.id });

    return deleted.length > 0;
  }

  private owned(id: string, ownerId: string) {
    return and(eq(designsSchema.id, id), eq(designsSchema.ownerId, ownerId));
  }
}
