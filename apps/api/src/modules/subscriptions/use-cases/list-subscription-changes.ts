import type { Page, PageRequest } from "@/core/pagination";
import { make, makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { BillingProvider } from "@/modules/billing-provider";

import { SubscriptionsRepository } from "../ports";
import type { SubscriptionChangeEntity } from "../subscription.entity";

export interface ListSubscriptionChangesUseCaseOptions {
  userId: string;
  page: PageRequest;
}

type Options = ListSubscriptionChangesUseCaseOptions;
type Result = Page<SubscriptionChangeEntity>;

export class ListSubscriptionChangesUseCase extends UseCase<Options, Result> {
  private readonly provider = make(BillingProvider);

  private readonly subscriptions = makeRepository(SubscriptionsRepository);

  public execute({ userId, page }: Options): Promise<Result> {
    return this.subscriptions.listChangesForUser(
      this.provider.name,
      userId,
      page,
    );
  }
}
