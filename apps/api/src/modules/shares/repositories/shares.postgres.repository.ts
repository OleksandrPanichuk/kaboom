import { and, eq, isNull, sql } from "drizzle-orm";

import { sharesSchema, type ShareSubject } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { ShareEntity } from "../share.entity";
import { type CreateShareData, SharesRepository } from "../shares.repository";

export class PostgresSharesRepository extends SharesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insertLive(data: CreateShareData): Promise<ShareEntity> {
    const [inserted] = await this.db
      .insert(sharesSchema)
      .values(data)
      .onConflictDoNothing({
        target: [sharesSchema.subject, sharesSchema.subjectId],
        where: sql`${sharesSchema.revokedAt} is null`,
      })
      .returning();

    if (inserted) return inserted;

    const live = await this.findLive(data.subject, data.subjectId);

    if (!live) throw new Error("A live share vanished while it was created");

    return live;
  }

  public async findLive(
    subject: ShareSubject,
    subjectId: string,
  ): Promise<ShareEntity | null> {
    const [row] = await this.db
      .select()
      .from(sharesSchema)
      .where(
        and(
          eq(sharesSchema.subject, subject),
          eq(sharesSchema.subjectId, subjectId),
          isNull(sharesSchema.revokedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public async findLiveByToken(token: string): Promise<ShareEntity | null> {
    const [row] = await this.db
      .select()
      .from(sharesSchema)
      .where(and(eq(sharesSchema.token, token), isNull(sharesSchema.revokedAt)))
      .limit(1);

    return row ?? null;
  }

  public async revoke(
    token: string,
    ownerId: string,
  ): Promise<ShareEntity | null> {
    const [row] = await this.db
      .update(sharesSchema)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sharesSchema.token, token),
          eq(sharesSchema.ownerId, ownerId),
          isNull(sharesSchema.revokedAt),
        ),
      )
      .returning();

    return row ?? null;
  }
}
