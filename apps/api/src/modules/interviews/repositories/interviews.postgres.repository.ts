import { and, eq, sql } from "drizzle-orm";

import type { Page, PageRequest } from "@/core/pagination";
import { interviewsSchema, problemsSchema } from "@/db";
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
