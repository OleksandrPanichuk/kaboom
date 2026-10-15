import { Repository } from "@/core/repository";
import type { BillingProviderName } from "@/db";
import type { ProviderDispute } from "@/modules/billing-provider";

import type { DisputeEntity } from "../dispute.entity";

export interface SyncDisputeData extends ProviderDispute {
  provider: BillingProviderName;
  userId: string | null;
  closed: boolean;
}

export abstract class DisputesRepository extends Repository {
  public abstract sync(data: SyncDisputeData, at: Date): Promise<DisputeEntity>;
}
