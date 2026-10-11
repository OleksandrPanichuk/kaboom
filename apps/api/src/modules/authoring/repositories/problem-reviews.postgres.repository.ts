import { and, desc, eq, inArray } from "drizzle-orm";

import type { Page, PageRequest } from "@/core/pagination";
import {
  isUniqueViolation,
  problemDraftsSchema,
  problemReviewsSchema,
  type ProblemReviewStatus,
  profilesSchema,
} from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { Keyset } from "@/db/pagination";

import type { ReviewEntity, ReviewListing } from "../draft.entity";
import {
  type CreateReviewData,
  ProblemReviewsRepository,
  type ReviewDecision,
} from "../ports/problem-reviews.repository";

const OLDEST_FIRST = new Keyset<ReviewListing>({
  sort: problemReviewsSchema.submittedAt,
  id: problemReviewsSchema.id,
  key: ({ review }) => [review.submittedAt, review.id],
});

const listing = () => ({
  review: problemReviewsSchema,
  problemId: problemDraftsSchema.problemId,
  handle: profilesSchema.handle,
  displayName: profilesSchema.displayName,
});

interface ListingRow {
  review: ReviewEntity;
  problemId: string | null;
  handle: string | null;
  displayName: string | null;
}

const toListing = ({
  review,
  problemId,
  handle,
  displayName,
}: ListingRow): ReviewListing => ({
  review,
  update: problemId !== null && review.status === "pending",
  author:
    handle !== null && displayName !== null ? { handle, displayName } : null,
});

export class PostgresProblemReviewsRepository extends ProblemReviewsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insertPending(
    data: CreateReviewData,
  ): Promise<ReviewEntity | null> {
    try {
      const [row] = await this.db
        .insert(problemReviewsSchema)
        .values(data)
        .returning();

      return row!;
    } catch (error) {
      if (isUniqueViolation(error)) return null;

      throw error;
    }
  }

  public async findById(id: string): Promise<ReviewEntity | null> {
    const [row] = await this.db
      .select()
      .from(problemReviewsSchema)
      .where(eq(problemReviewsSchema.id, id))
      .limit(1);

    return row ?? null;
  }

  public async findListing(id: string): Promise<ReviewListing | null> {
    const [row] = await this.db
      .select(listing())
      .from(problemReviewsSchema)
      .innerJoin(
        problemDraftsSchema,
        eq(problemDraftsSchema.id, problemReviewsSchema.draftId),
      )
      .leftJoin(
        profilesSchema,
        eq(profilesSchema.userId, problemReviewsSchema.authorId),
      )
      .where(eq(problemReviewsSchema.id, id))
      .limit(1);

    return row ? toListing(row) : null;
  }

  public listForDraft(draftId: string): Promise<ReviewEntity[]> {
    return this.listForDrafts([draftId]);
  }

  public listForDrafts(draftIds: readonly string[]): Promise<ReviewEntity[]> {
    if (draftIds.length === 0) return Promise.resolve([]);

    return this.db
      .select()
      .from(problemReviewsSchema)
      .where(inArray(problemReviewsSchema.draftId, [...draftIds]))
      .orderBy(
        desc(problemReviewsSchema.submittedAt),
        desc(problemReviewsSchema.id),
      );
  }

  public async list(
    status: ProblemReviewStatus,
    page: PageRequest,
  ): Promise<Page<ReviewListing>> {
    const rows = await this.db
      .select(listing())
      .from(problemReviewsSchema)
      .innerJoin(
        problemDraftsSchema,
        eq(problemDraftsSchema.id, problemReviewsSchema.draftId),
      )
      .leftJoin(
        profilesSchema,
        eq(profilesSchema.userId, problemReviewsSchema.authorId),
      )
      .where(
        and(
          eq(problemReviewsSchema.status, status),
          OLDEST_FIRST.after(page.cursor),
        ),
      )
      .orderBy(...OLDEST_FIRST.orderBy())
      .limit(OLDEST_FIRST.limit(page));

    return OLDEST_FIRST.page(rows.map(toListing), page);
  }

  public async decide(
    id: string,
    { status, reviewerId, feedback, content, difficulty }: ReviewDecision,
  ): Promise<ReviewEntity | null> {
    const [row] = await this.db
      .update(problemReviewsSchema)
      .set({
        status,
        reviewerId,
        feedback,
        decidedAt: new Date(),
        ...(content !== undefined ? { content } : {}),
        ...(difficulty !== undefined ? { difficulty } : {}),
      })
      .where(
        and(
          eq(problemReviewsSchema.id, id),
          eq(problemReviewsSchema.status, "pending"),
        ),
      )
      .returning();

    return row ?? null;
  }
}
