import { Port } from "@/core/port";
import type {
  BillingProviderName,
  PriceInterval,
  PriceType,
  TaxBehavior,
} from "@/db";

export interface ProviderPrice {
  id: string;
  lookupKey: string | null;
  type: PriceType;
  interval: PriceInterval | null;
  intervalCount: number | null;
  unitAmount: number;
  currency: string;
  taxBehavior: TaxBehavior;
  active: boolean;
}

export abstract class BillingProvider extends Port {
  public abstract readonly name: BillingProviderName;

  public abstract findPrices(
    lookupKeys: readonly string[],
  ): Promise<ProviderPrice[]>;
}
