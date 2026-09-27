import { dayOf, tokensOf } from "@/platform/llm/llm.helpers";
import type { LlmUsage } from "@/platform/llm/ports/language-model";
import { UsageLedger } from "@/platform/llm/ports/usage-ledger";

export class MemoryUsageLedger extends UsageLedger {
  private readonly spent = new Map<string, number>();

  constructor(
    private readonly budget: number,
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  private key(userId: string): string {
    return `${userId}:${dayOf(this.now())}`;
  }

  public spentToday(userId: string): Promise<number> {
    return Promise.resolve(this.spent.get(this.key(userId)) ?? 0);
  }

  public async reserve(userId: string, estimate: number): Promise<boolean> {
    return (await this.spentToday(userId)) + estimate <= this.budget;
  }

  public record(userId: string, usage: LlmUsage): Promise<void> {
    const key = this.key(userId);

    this.spent.set(key, (this.spent.get(key) ?? 0) + tokensOf(usage));

    return Promise.resolve();
  }

  public clear(): void {
    this.spent.clear();
  }
}
