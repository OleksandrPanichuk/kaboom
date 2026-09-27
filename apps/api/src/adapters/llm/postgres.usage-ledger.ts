import { and, eq, sql } from "drizzle-orm";

import { llmUsageSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { dayOf, tokensOf } from "@/platform/llm/llm.helpers";
import type { LlmUsage } from "@/platform/llm/ports/language-model";
import { UsageLedger } from "@/platform/llm/ports/usage-ledger";

export class PostgresUsageLedger extends UsageLedger {
  constructor(
    private readonly budget: number,
    private readonly now: () => Date = () => new Date(),
    private readonly resolve: () => DBExecutor = getExecutor,
  ) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async spentToday(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ tokens: llmUsageSchema.tokens })
      .from(llmUsageSchema)
      .where(
        and(
          eq(llmUsageSchema.userId, userId),
          eq(llmUsageSchema.day, dayOf(this.now())),
        ),
      )
      .limit(1);

    return row?.tokens ?? 0;
  }

  public async reserve(userId: string, estimate: number): Promise<boolean> {
    return (await this.spentToday(userId)) + estimate <= this.budget;
  }

  public async record(userId: string, usage: LlmUsage): Promise<void> {
    const tokens = tokensOf(usage);

    await this.db
      .insert(llmUsageSchema)
      .values({ userId, day: dayOf(this.now()), tokens })
      .onConflictDoUpdate({
        target: [llmUsageSchema.userId, llmUsageSchema.day],
        set: {
          tokens: sql`${llmUsageSchema.tokens} + ${tokens}`,
          updatedAt: new Date(),
        },
      });
  }
}
