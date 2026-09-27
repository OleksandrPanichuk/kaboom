import { Port } from "@/core/port";

import type { LlmUsage } from "./language-model";

export abstract class UsageLedger extends Port {
  public abstract reserve(userId: string, estimate: number): Promise<boolean>;

  public abstract record(userId: string, usage: LlmUsage): Promise<void>;

  public abstract spentToday(userId: string): Promise<number>;
}
