import { BillingUnavailableError } from "@/modules/billing-provider/billing-provider.errors";
import {
  BillingProvider,
  type ProviderCheckout,
  type ProviderCustomer,
  type ProviderDispute,
  type ProviderEvent,
  type ProviderInvoice,
  type ProviderPayment,
  type ProviderPrice,
  type ProviderRefund,
  type ProviderSubscription,
  type ProviderTaxId,
} from "@/modules/billing-provider/ports/billing-provider";

const unavailable = () =>
  new BillingUnavailableError(
    "Billing is not configured: set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET",
  );

export class UnavailableBillingProvider extends BillingProvider {
  public readonly name = "stripe" as const;

  public readonly available = false;

  public readonly collectsTax = false;

  public readonly signatureHeader = "stripe-signature";

  public parseWebhook(): Promise<ProviderEvent> {
    return Promise.reject(unavailable());
  }

  public findPrices(): Promise<ProviderPrice[]> {
    return Promise.reject(unavailable());
  }

  public listEvents(): AsyncIterable<ProviderEvent> {
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.reject(unavailable()),
      }),
    };
  }

  public findCustomer(): Promise<ProviderCustomer | null> {
    return Promise.reject(unavailable());
  }

  public findSubscription(): Promise<ProviderSubscription | null> {
    return Promise.reject(unavailable());
  }

  public createCustomer(): Promise<ProviderCustomer> {
    return Promise.reject(unavailable());
  }

  public createSubscription(): Promise<ProviderCheckout<ProviderSubscription>> {
    return Promise.reject(unavailable());
  }

  public subscriptionCheckout(): Promise<
    ProviderCheckout<ProviderSubscription>
  > {
    return Promise.reject(unavailable());
  }

  public scheduleCancellation(): Promise<ProviderSubscription> {
    return Promise.reject(unavailable());
  }

  public cancelSubscription(): Promise<ProviderSubscription> {
    return Promise.reject(unavailable());
  }

  public deleteCustomer(): Promise<void> {
    return Promise.reject(unavailable());
  }

  public findInvoice(): Promise<ProviderInvoice | null> {
    return Promise.reject(unavailable());
  }

  public findPayment(): Promise<ProviderPayment | null> {
    return Promise.reject(unavailable());
  }

  public findRefund(): Promise<ProviderRefund | null> {
    return Promise.reject(unavailable());
  }

  public findDispute(): Promise<ProviderDispute | null> {
    return Promise.reject(unavailable());
  }

  public findTaxId(): Promise<ProviderTaxId | null> {
    return Promise.reject(unavailable());
  }
}
