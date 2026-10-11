import { count, desc, eq } from "drizzle-orm";

import { problemDraftsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { DraftEntity } from "../draft.entity";
import {
  type CreateDraftData,
  ProblemDraftsRepository,
} from "../ports/problem-drafts.repository";

export class PostgresProblemDraftsRepository extends ProblemDraftsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async create(data: CreateDraftData): Promise<DraftEntity> {
    const [row] = await this.db
      .insert(problemDraftsSchema)
      .values(data)
      .returning();

    return row!;
  }

  public async findById(id: string): Promise<DraftEntity | null> {
    const [row] = await this.db
      .select()
      .from(problemDraftsSchema)
      .where(eq(problemDraftsSchema.id, id))
      .limit(1);

    return row ?? null;
  }

  public listForAuthor(authorId: string): Promise<DraftEntity[]> {
    return this.db
      .select()
      .from(problemDraftsSchema)
      .where(eq(problemDraftsSchema.authorId, authorId))
      .orderBy(desc(problemDraftsSchema.updatedAt));
  }

  public async countForAuthor(authorId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(problemDraftsSchema)
      .where(eq(problemDraftsSchema.authorId, authorId));

    return row?.value ?? 0;
  }

  public async updateContent(
    id: string,
    content: unknown,
  ): Promise<DraftEntity> {
    const [row] = await this.db
      .update(problemDraftsSchema)
      .set({ content, updatedAt: new Date() })
      .where(eq(problemDraftsSchema.id, id))
      .returning();

    return row!;
  }

  public async linkProblem(id: string, problemId: string): Promise<void> {
    await this.db
      .update(problemDraftsSchema)
      .set({ problemId })
      .where(eq(problemDraftsSchema.id, id));
  }

  public async delete(id: string): Promise<void> {
    await this.db
      .delete(problemDraftsSchema)
      .where(eq(problemDraftsSchema.id, id));
  }
}
