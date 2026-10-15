import { make, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import type { PriceType } from "@/db";
import { BillingAccountService } from "@/modules/billing-account";
import {
  type BillingCustomerEntity,
  BillingCustomersService,
  type BillingUser,
} from "@/modules/billing-customers";
import {
  BillingOfferNotFoundError,
  BillingOffersService,
  type OfferedPrice,
} from "@/modules/billing-offers";
import { BillingProvider } from "@/modules/billing-provider";
import { type PurchaseEntity, PurchasesService } from "@/modules/purchases";
import {
  type SubscriptionEntity,
  SubscriptionsService,
} from "@/modules/subscriptions";

import {
  AlreadyProError,
  BillingAddressRequiredError,
} from "./checkout.errors";

export interface SubscriptionCheckout {
  subscription: SubscriptionEntity;
  clientSecret: string | null;
}

export interface LifetimeCheckout {
  purchase: PurchaseEntity;
  clientSecret: string | null;
}

export class CheckoutService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  private readonly billingOffersService = makeService(BillingOffersService);

  private readonly billingAccountService = makeService(BillingAccountService);

  private readonly subscriptionsService = makeService(SubscriptionsService);

  private readonly purchasesService = makeService(PurchasesService);

  public async subscribe(
    user: BillingUser,
    offerKey: string,
  ): Promise<SubscriptionCheckout> {
    const { price } = await this.offered(offerKey, "recurring");
    const customer = await this.prepare(user, "subscription");

    return this.billingCustomersService.locked(
      customer.providerCustomerId,
      async () => {
        const pending = await this.subscriptionsService.currentFor(user.id);
        const cause = {
          billingEventId: null,
          at: new Date(),
          actor: "user" as const,
          actorUserId: user.id,
        };

        if (pending?.status === "incomplete") {
          if (pending.providerPriceId === price.providerPriceId) {
            const checkout = await this.provider.subscriptionCheckout(
              pending.providerSubscriptionId,
            );

            if (checkout.clientSecret !== null) {
              return {
                subscription: await this.subscriptionsService.record(
                  checkout.object,
                  cause,
                ),
                clientSecret: checkout.clientSecret,
              };
            }
          }

          await this.subscriptionsService.record(
            await this.provider.cancelSubscription(
              pending.providerSubscriptionId,
            ),
            cause,
          );
        }

        const checkout = await this.provider.createSubscription({
          customerId: customer.providerCustomerId,
          priceId: price.providerPriceId,
        });

        return {
          subscription: await this.subscriptionsService.record(
            checkout.object,
            cause,
          ),
          clientSecret: checkout.clientSecret,
        };
      },
    );
  }

  public async buyLifetime(
    user: BillingUser,
    offerKey: string,
  ): Promise<LifetimeCheckout> {
    const { price } = await this.offered(offerKey, "one_time");
    const customer = await this.prepare(user, "lifetime");

    return this.billingCustomersService.locked(
      customer.providerCustomerId,
      async () => {
        const pending = await this.purchasesService.currentFor(user.id);

        if (pending?.status === "pending") {
          if (pending.providerPriceId === price.providerPriceId) {
            const checkout = await this.provider.invoiceCheckout(
              pending.providerInvoiceId,
            );
            const purchase = await this.purchasesService.record(
              checkout.object,
            );

            if (purchase && checkout.clientSecret !== null) {
              return { purchase, clientSecret: checkout.clientSecret };
            }
          } else {
            await this.purchasesService.record(
              await this.provider.voidInvoice(pending.providerInvoiceId),
            );
          }
        }

        const checkout = await this.provider.createInvoice({
          customerId: customer.providerCustomerId,
          priceId: price.providerPriceId,
        });
        const purchase = await this.purchasesService.record(checkout.object);

        if (!purchase) {
          throw new Error(
            `The ${this.provider.name} invoice ${checkout.object.id} is not a lifetime purchase`,
          );
        }

        return { purchase, clientSecret: checkout.clientSecret };
      },
    );
  }

  private async offered(key: string, type: PriceType): Promise<OfferedPrice> {
    const offered = await this.billingOffersService.findOffered(key);

    if (offered.offer.type !== type) {
      throw new BillingOfferNotFoundError(
        `"${key}" is not sold as ${type === "recurring" ? "a subscription" : "a one-off purchase"}`,
      );
    }

    return offered;
  }

  private async prepare(
    user: BillingUser,
    buying: "subscription" | "lifetime",
  ): Promise<BillingCustomerEntity> {
    const { plan, source } = await this.billingAccountService.planOf(user.id);

    if (
      plan !== "free" &&
      (buying === "subscription" || source === "lifetime")
    ) {
      throw new AlreadyProError(
        source === "lifetime"
          ? "You already have Pro for life"
          : "You already have Pro",
      );
    }

    const customer = await this.billingCustomersService.forUser(user);

    if (this.provider.collectsTax && customer.addressCountry === null) {
      throw new BillingAddressRequiredError(
        "Add your billing address first, so tax can be worked out",
      );
    }

    return customer;
  }
}
