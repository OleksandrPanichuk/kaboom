import {
  and,
  asc,
  eq,
  exists,
  gt,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Page, PageRequest } from "@/core/pagination";
import {
  type CommentRemover,
  type ProblemCommentRow,
  problemCommentsSchema,
  profilesSchema,
} from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { Keyset } from "@/db/pagination";

import {
  type DigestQuery,
  type EditProblemCommentData,
  type PostProblemCommentData,
  ProblemCommentsRepository,
} from "../ports";
import type { ListedComment } from "../problem-comment.entity";

const BY_NEWEST = new Keyset<ListedComment>({
  sort: problemCommentsSchema.createdAt,
  id: problemCommentsSchema.id,
  direction: "desc",
  key: (comment) => [comment.createdAt, comment.id],
});

interface ListedRow {
  comment: ProblemCommentRow;
  handle: string | null;
  displayName: string | null;
  avatarKey: string | null;
  visible: boolean | null;
}

const toListed = (row: ListedRow): ListedComment => ({
  ...row.comment,
  author:
    row.handle !== null && row.displayName !== null && row.visible
      ? {
          handle: row.handle,
          displayName: row.displayName,
          avatarKey: row.avatarKey,
        }
      : null,
});

export class PostgresProblemCommentsRepository extends ProblemCommentsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  private selectListed() {
    return this.db
      .select({
        comment: problemCommentsSchema,
        handle: profilesSchema.handle,
        displayName: profilesSchema.displayName,
        avatarKey: profilesSchema.avatarKey,
        visible: profilesSchema.visible,
      })
      .from(problemCommentsSchema)
      .leftJoin(
        profilesSchema,
        eq(profilesSchema.userId, problemCommentsSchema.authorId),
      );
  }

  public async insert(data: PostProblemCommentData) {
    const [row] = await this.db
      .insert(problemCommentsSchema)
      .values(data)
      .returning();

    return row!;
  }

  public async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(problemCommentsSchema)
      .where(eq(problemCommentsSchema.id, id))
      .limit(1);

    return row ?? null;
  }

  public async findListed(id: string): Promise<ListedComment | null> {
    const [row] = await this.selectListed()
      .where(eq(problemCommentsSchema.id, id))
      .limit(1);

    return row ? toListed(row) : null;
  }

  public async listThreads(
    problemId: string,
    request: PageRequest,
  ): Promise<Page<ListedComment>> {
    const reply = alias(problemCommentsSchema, "reply");
    const rows = await this.selectListed()
      .where(
        and(
          eq(problemCommentsSchema.problemId, problemId),
          isNull(problemCommentsSchema.parentId),
          or(
            isNull(problemCommentsSchema.removedAt),
            exists(
              this.db
                .select({ one: sql`1` })
                .from(reply)
                .where(
                  and(
                    eq(reply.parentId, problemCommentsSchema.id),
                    isNull(reply.removedAt),
                  ),
                ),
            ),
          ),
          BY_NEWEST.after(request.cursor),
        ),
      )
      .orderBy(...BY_NEWEST.orderBy())
      .limit(BY_NEWEST.limit(request));

    return BY_NEWEST.page(rows.map(toListed), request);
  }

  public async listReplies(
    parentIds: readonly string[],
  ): Promise<ListedComment[]> {
    if (parentIds.length === 0) return [];

    const rows = await this.selectListed()
      .where(
        and(
          inArray(problemCommentsSchema.parentId, [...parentIds]),
          isNull(problemCommentsSchema.removedAt),
        ),
      )
      .orderBy(
        asc(problemCommentsSchema.createdAt),
        asc(problemCommentsSchema.id),
      );

    return rows.map(toListed);
  }

  public async listForDigest({
    problemId,
    userId,
    everything,
    after,
  }: DigestQuery): Promise<ListedComment[]> {
    const mine = alias(problemCommentsSchema, "mine");
    const rows = await this.selectListed()
      .where(
        and(
          eq(problemCommentsSchema.problemId, problemId),
          ne(problemCommentsSchema.authorId, userId),
          isNull(problemCommentsSchema.removedAt),
          gt(
            sql`date_trunc('milliseconds', ${problemCommentsSchema.createdAt})`,
            after,
          ),
          everything
            ? undefined
            : exists(
                this.db
                  .select({ one: sql`1` })
                  .from(mine)
                  .where(
                    and(
                      eq(mine.authorId, userId),
                      or(
                        eq(mine.id, problemCommentsSchema.parentId),
                        eq(mine.parentId, problemCommentsSchema.parentId),
                      ),
                    ),
                  ),
              ),
        ),
      )
      .orderBy(
        asc(problemCommentsSchema.createdAt),
        asc(problemCommentsSchema.id),
      );

    return rows.map(toListed);
  }

  public async participants(threadId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ authorId: problemCommentsSchema.authorId })
      .from(problemCommentsSchema)
      .where(
        or(
          eq(problemCommentsSchema.id, threadId),
          eq(problemCommentsSchema.parentId, threadId),
        ),
      );

    return rows.map((row) => row.authorId);
  }

  public async countReplies(parentId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(problemCommentsSchema)
      .where(
        and(
          eq(problemCommentsSchema.parentId, parentId),
          isNull(problemCommentsSchema.removedAt),
        ),
      );

    return row?.count ?? 0;
  }

  public async edit(id: string, data: EditProblemCommentData) {
    const [row] = await this.db
      .update(problemCommentsSchema)
      .set({ ...data, editedAt: new Date() })
      .where(
        and(
          eq(problemCommentsSchema.id, id),
          isNull(problemCommentsSchema.removedAt),
        ),
      )
      .returning();

    return row ?? null;
  }

  public async remove(id: string, by: CommentRemover) {
    const [row] = await this.db
      .update(problemCommentsSchema)
      .set({ removedAt: new Date(), removedBy: by })
      .where(
        and(
          eq(problemCommentsSchema.id, id),
          isNull(problemCommentsSchema.removedAt),
        ),
      )
      .returning();

    return row ?? null;
  }
}
