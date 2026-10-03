import { asc, eq } from "drizzle-orm";

import { problemsSchema, type SkillScoreRow, skillScoresSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  type CreateSkillScoreData,
  SkillScoresRepository,
} from "../ports/skill-scores.repository";
import type { SkillHistoryPoint, SkillScoreEntity } from "../skill.entity";

const toEntity = (row: SkillScoreRow): SkillScoreEntity =>
  row as SkillScoreEntity;

export class PostgresSkillScoresRepository extends SkillScoresRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insertMany(rows: CreateSkillScoreData[]): Promise<void> {
    if (rows.length === 0) return;

    await this.db.insert(skillScoresSchema).values(rows).onConflictDoNothing();
  }

  public async listFor(userId: string): Promise<SkillScoreEntity[]> {
    const rows = await this.db
      .select()
      .from(skillScoresSchema)
      .where(eq(skillScoresSchema.userId, userId))
      .orderBy(asc(skillScoresSchema.createdAt));

    return rows.map(toEntity);
  }

  public async historyFor(userId: string): Promise<SkillHistoryPoint[]> {
    const rows = await this.db
      .select({
        skill: skillScoresSchema.skill,
        score: skillScoresSchema.score,
        weight: skillScoresSchema.weight,
        submissionId: skillScoresSchema.submissionId,
        slug: problemsSchema.slug,
        title: problemsSchema.title,
        at: skillScoresSchema.createdAt,
      })
      .from(skillScoresSchema)
      .innerJoin(
        problemsSchema,
        eq(problemsSchema.id, skillScoresSchema.problemId),
      )
      .where(eq(skillScoresSchema.userId, userId))
      .orderBy(asc(skillScoresSchema.createdAt), asc(skillScoresSchema.id));

    return rows.map((row) => ({
      skill: row.skill as SkillHistoryPoint["skill"],
      score: row.score,
      weight: row.weight,
      source: row.submissionId ? "challenge" : "interview",
      problem: { slug: row.slug, title: row.title },
      at: row.at,
    }));
  }
}
