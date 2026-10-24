import { and, eq, gte, inArray, sql } from "drizzle-orm";

import type { Page, PageRequest } from "@/core/pagination";
import {
  interviewEventsSchema,
  interviewsSchema,
  type InterviewStatus,
  problemsSchema,
} from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { Keyset } from "@/db/pagination";

import type {
  InterviewEntity,
  InterviewSummaryEntity,
} from "../interview.entity";
import {
  type CreateInterviewData,
  InterviewsRepository,
} from "../ports/interviews.repository";

const NEWEST_FIRST = new Keyset<InterviewSummaryEntity>({
  sort: interviewsSchema.startedAt,
  id: interviewsSchema.id,
  direction: "desc",
  key: ({ interview }) => [interview.startedAt, interview.id],
});

export class PostgresInterviewsRepository extends InterviewsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(data: CreateInterviewData): Promise<InterviewEntity> {
    const [row] = await this.db
      .insert(interviewsSchema)
      .values(data)
      .returning();

    return row!;
  }

  public async findOwned(
    id: string,
    ownerId: string,
  ): Promise<InterviewEntity | null> {
    const [row] = await this.db
      .select()
      .from(interviewsSchema)
      .where(
        and(eq(interviewsSchema.id, id), eq(interviewsSchema.ownerId, ownerId)),
      )
      .limit(1);

    return row ?? null;
  }

  public async startedAtsFor(ownerId: string): Promise<Date[]> {
    const rows = await this.db
      .select({ startedAt: interviewsSchema.startedAt })
      .from(interviewsSchema)
      .where(eq(interviewsSchema.ownerId, ownerId));

    return rows.map((row) => row.startedAt);
  }

  public async countStartedSince(
    ownerId: string,
    since: Date,
  ): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(interviewsSchema)
      .where(
        and(
          eq(interviewsSchema.ownerId, ownerId),
          gte(interviewsSchema.startedAt, since),
        ),
      );

    return row?.total ?? 0;
  }

  public async problemsReviewedSince(
    ownerId: string,
    problemIds: readonly string[],
    since: Date,
  ): Promise<Set<string>> {
    if (problemIds.length === 0) return new Set();

    const rows = await this.db
      .selectDistinct({ problemId: interviewsSchema.problemId })
      .from(interviewsSchema)
      .where(
        and(
          eq(interviewsSchema.ownerId, ownerId),
          eq(interviewsSchema.status, "reviewed"),
          inArray(interviewsSchema.problemId, [...problemIds]),
          gte(interviewsSchema.startedAt, since),
        ),
      );

    return new Set(rows.map((row) => row.problemId));
  }

  public async findActive(ownerId: string): Promise<InterviewEntity | null> {
    const [row] = await this.db
      .select()
      .from(interviewsSchema)
      .where(
        and(
          eq(interviewsSchema.ownerId, ownerId),
          eq(interviewsSchema.status, "active"),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public async listOwned(
    ownerId: string,
    page: PageRequest,
  ): Promise<Page<InterviewSummaryEntity>> {
    const rows = await this.db
      .select({
        interview: interviewsSchema,
        problem: {
          slug: problemsSchema.slug,
          title: problemsSchema.title,
          difficulty: problemsSchema.difficulty,
        },
      })
      .from(interviewsSchema)
      .innerJoin(
        problemsSchema,
        eq(problemsSchema.id, interviewsSchema.problemId),
      )
      .where(
        and(
          eq(interviewsSchema.ownerId, ownerId),
          NEWEST_FIRST.after(page.cursor),
        ),
      )
      .orderBy(...NEWEST_FIRST.orderBy())
      .limit(NEWEST_FIRST.limit(page));

    return NEWEST_FIRST.page(rows, page);
  }

  public async nextSeq(id: string): Promise<number> {
    const [row] = await this.db
      .update(interviewsSchema)
      .set({ eventSeq: sql`${interviewsSchema.eventSeq} + 1` })
      .where(eq(interviewsSchema.id, id))
      .returning({ eventSeq: interviewsSchema.eventSeq });

    return row!.eventSeq;
  }

  public async transition(
    id: string,
    from: InterviewStatus,
    to: InterviewStatus,
  ): Promise<InterviewEntity | null> {
    const [row] = await this.db
      .update(interviewsSchema)
      .set({ status: to })
      .where(
        and(eq(interviewsSchema.id, id), eq(interviewsSchema.status, from)),
      )
      .returning();

    return row ?? null;
  }

  public listIdle(before: Date): Promise<InterviewEntity[]> {
    const lastActivity = sql`coalesce((select max(${interviewEventsSchema.createdAt}) from ${interviewEventsSchema} where ${interviewEventsSchema.interviewId} = ${interviewsSchema.id}), ${interviewsSchema.startedAt})`;

    return this.db
      .select()
      .from(interviewsSchema)
      .where(
        and(
          eq(interviewsSchema.status, "active"),
          sql`${lastActivity} < ${before}`,
        ),
      );
  }

  public async markExpired(id: string): Promise<InterviewEntity | null> {
    const [row] = await this.db
      .update(interviewsSchema)
      .set({ status: "expired", endedAt: new Date() })
      .where(
        and(eq(interviewsSchema.id, id), eq(interviewsSchema.status, "active")),
      )
      .returning();

    return row ?? null;
  }

  public async markReviewing(
    id: string,
    finalRevision: number,
  ): Promise<InterviewEntity | null> {
    const [row] = await this.db
      .update(interviewsSchema)
      .set({ status: "reviewing", finalRevision, endedAt: new Date() })
      .where(
        and(eq(interviewsSchema.id, id), eq(interviewsSchema.status, "active")),
      )
      .returning();

    return row ?? null;
  }

  public async findById(id: string): Promise<InterviewEntity | null> {
    const [row] = await this.db
      .select()
      .from(interviewsSchema)
      .where(eq(interviewsSchema.id, id))
      .limit(1);

    return row ?? null;
  }

  public listActive(): Promise<InterviewEntity[]> {
    return this.db
      .select()
      .from(interviewsSchema)
      .where(eq(interviewsSchema.status, "active"));
  }

  public async setPhase(id: string, phase: string): Promise<InterviewEntity> {
    const [row] = await this.db
      .update(interviewsSchema)
      .set({ phase, phaseStartedAt: new Date() })
      .where(eq(interviewsSchema.id, id))
      .returning();

    return row!;
  }
}
