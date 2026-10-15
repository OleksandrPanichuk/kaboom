import { NotFoundError } from "@/core/errors";
import { make, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { BillingProviderName } from "@/db";
import { BillingProvider } from "@/modules/billing-provider";

import { BillingEventInboxService } from "../billing-event-inbox.service";

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
  private readonly provider = make(BillingProvider);

  private readonly billingEventInboxService = makeService(
    BillingEventInboxService,
  );

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
    const { duplicate } = await this.billingEventInboxService.receive(parsed);

    return { duplicate };
  }
}
