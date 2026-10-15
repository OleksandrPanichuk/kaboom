import { BillingUnavailableError } from "@/modules/billing-provider/billing-provider.errors";
import {
  BillingProvider,
  type ProviderCustomer,
  type ProviderEvent,
  type ProviderInvoice,
  type ProviderPayment,
  type ProviderPrice,
  type ProviderSubscription,
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

  public findCustomer(): Promise<ProviderCustomer | null> {
    return Promise.reject(unavailable());
  }

  public findSubscription(): Promise<ProviderSubscription | null> {
    return Promise.reject(unavailable());
  }

  public findInvoice(): Promise<ProviderInvoice | null> {
    return Promise.reject(unavailable());
  }

  public findPayment(): Promise<ProviderPayment | null> {
    return Promise.reject(unavailable());
  }
}
