import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import {
  EntitlementsService,
  type InterviewPeriod,
  PlanLimitError,
} from "@/modules/entitlements";

import { quotaWindow } from "./interviews.quota";
import { InterviewsRepository } from "./ports";

export interface InterviewQuota {
  limit: number;
  per: InterviewPeriod;
  used: number;
  resetsAt: Date;
}

export class InterviewQuotaService extends Service {
  private readonly entitlements = makeService(EntitlementsService);

  private readonly interviews = makeRepository(InterviewsRepository);

  public async of(ownerId: string, now = new Date()): Promise<InterviewQuota> {
    const { entitlements } = await this.entitlements.of(ownerId);
    const { limit, per } = entitlements.interviews;
    const window = quotaWindow(per, now);
    const used = await this.interviews.countStartedSince(ownerId, window.from);

    return { limit, per, used, resetsAt: window.resetsAt };
  }

  public async require(ownerId: string): Promise<void> {
    const quota = await this.of(ownerId);

    if (quota.used >= quota.limit) {
      throw new PlanLimitError(
        quota.per === "day"
          ? "You have used today's interviews"
          : "You have used this week's interview",
        {
          feature: "interviews",
          limit: quota.limit,
          per: quota.per,
          resetsAt: quota.resetsAt.toISOString(),
        },
      );
    }
  }
}
