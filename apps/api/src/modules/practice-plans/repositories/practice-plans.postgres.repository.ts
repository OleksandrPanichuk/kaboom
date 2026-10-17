import { and, asc, eq, isNull } from "drizzle-orm";

import { practicePlanItemsSchema, practicePlansSchema } from "@/db";
import { type DBExecutor, getExecutor, transaction } from "@/db/executor";

import {
  type PlannedProblem,
  PracticePlansRepository,
  type StartPracticePlanData,
} from "../ports";
import type { PracticePlanEntity } from "../practice-plan.entity";

export class PostgresPracticePlansRepository extends PracticePlansRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public replaceForWeek({
    problemIds,
    ...data
  }: StartPracticePlanData): Promise<PracticePlanEntity> {
    return transaction(async () => {
      await this.deleteForWeek(data.userId, data.weekStart);

      const [plan] = await this.db
        .insert(practicePlansSchema)
        .values(data)
        .returning();

      await this.db.insert(practicePlanItemsSchema).values(
        problemIds.map((problemId, position) => ({
          planId: plan!.id,
          position,
          problemId,
        })),
      );

      return plan!;
    });
  }

  public async findForWeek(
    userId: string,
    weekStart: string,
  ): Promise<PracticePlanEntity | null> {
    const [row] = await this.db
      .select()
      .from(practicePlansSchema)
      .where(this.ofWeek(userId, weekStart))
      .limit(1);

    return row ?? null;
  }

  public listItems(planId: string): Promise<PlannedProblem[]> {
    return this.db
      .select({
        position: practicePlanItemsSchema.position,
        problemId: practicePlanItemsSchema.problemId,
      })
      .from(practicePlanItemsSchema)
      .where(eq(practicePlanItemsSchema.planId, planId))
      .orderBy(asc(practicePlanItemsSchema.position));
  }

  public async deleteForWeek(
    userId: string,
    weekStart: string,
  ): Promise<boolean> {
    const deleted = await this.db
      .delete(practicePlansSchema)
      .where(this.ofWeek(userId, weekStart))
      .returning({ id: practicePlansSchema.id });

    return deleted.length > 0;
  }

  public listUnreminded(weekStart: string): Promise<PracticePlanEntity[]> {
    return this.db
      .select()
      .from(practicePlansSchema)
      .where(
        and(
          eq(practicePlansSchema.weekStart, weekStart),
          isNull(practicePlansSchema.remindedAt),
        ),
      );
  }

  public async markReminded(id: string, at: Date): Promise<void> {
    await this.db
      .update(practicePlansSchema)
      .set({ remindedAt: at })
      .where(eq(practicePlansSchema.id, id));
  }

  private ofWeek(userId: string, weekStart: string) {
    return and(
      eq(practicePlansSchema.userId, userId),
      eq(practicePlansSchema.weekStart, weekStart),
    );
  }
}
