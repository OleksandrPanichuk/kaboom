import { BillingUnavailableError } from "@/modules/billing-provider/billing-provider.errors";
import {
  BillingProvider,
  type ProviderEvent,
  type ProviderPrice,
} from "@/modules/billing-provider/ports/billing-provider";

const unavailable = () =>
  new BillingUnavailableError(
    "Billing is not configured: set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET",
  );

export class UnavailableBillingProvider extends BillingProvider {
  public readonly name = "stripe" as const;

  public readonly available = false;

  public readonly signatureHeader = "stripe-signature";

  public parseWebhook(): Promise<ProviderEvent> {
    return Promise.reject(unavailable());
  }

  public findPrices(): Promise<ProviderPrice[]> {
    return Promise.reject(unavailable());
  }
}
