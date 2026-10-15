import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { SubscriptionEntity } from "../subscription.entity";
import { SubscriptionsService } from "../subscriptions.service";

export interface ResumeSubscriptionUseCaseOptions {
  userId: string;
}

type Options = ResumeSubscriptionUseCaseOptions;
type Result = SubscriptionEntity;

export class ResumeSubscriptionUseCase extends UseCase<Options, Result> {
  private readonly subscriptionsService = makeService(SubscriptionsService);

  public execute({ userId }: Options): Promise<Result> {
    return this.subscriptionsService.scheduleCancellation(userId, false);
  }
}
