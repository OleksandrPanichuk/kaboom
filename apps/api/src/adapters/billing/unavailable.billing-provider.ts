import { BillingUnavailableError } from "@/modules/billing/billing.errors";
import {
  BillingProvider,
  type ProviderPrice,
} from "@/modules/billing/ports/billing-provider";

export class UnavailableBillingProvider extends BillingProvider {
  public readonly name = "stripe" as const;

  public findPrices(): Promise<ProviderPrice[]> {
    return Promise.reject(
      new BillingUnavailableError(
        "Billing is not configured: set STRIPE_SECRET_KEY",
      ),
    );
  }
}
