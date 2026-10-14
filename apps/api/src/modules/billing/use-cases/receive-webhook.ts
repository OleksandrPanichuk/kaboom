import { NotFoundError } from "@/core/errors";
import { make, makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { BillingProviderName } from "@/db";

import { ProcessBillingEventJob } from "../jobs/process-billing-event.job";
import { BillingEventsRepository, BillingProvider } from "../ports";

export interface ReceiveWebhookUseCaseOptions {
  provider: BillingProviderName;
  payload: string;
  headers: Record<string, string | undefined>;
}

export interface ReceivedWebhook {
  duplicate: boolean;
}

type Options = ReceiveWebhookUseCaseOptions;
type Result = ReceivedWebhook;

export class ReceiveWebhookUseCase extends UseCase<Options, Result> {
  private get provider() {
    return make(BillingProvider);
  }

  private readonly events = makeRepository(BillingEventsRepository);

  public async execute({
    provider,
    payload,
    headers,
  }: Options): Promise<Result> {
    if (provider !== this.provider.name) {
      throw new NotFoundError("Billing does not use this provider");
    }

    const parsed = await this.provider.parseWebhook(
      payload,
      headers[this.provider.signatureHeader] ?? null,
    );
    const { event, duplicate } = await this.events.receive({
      ...parsed,
      provider,
    });

    if (event.status === "pending" || event.status === "failed") {
      await make(ProcessBillingEventJob).dispatch(
        { eventId: event.id },
        { jobId: event.id },
      );
    }

    return { duplicate };
  }
}
