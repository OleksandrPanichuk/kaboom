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

export class CheckoutService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  private readonly billingOffersService = makeService(BillingOffersService);

  private readonly billingAccountService = makeService(BillingAccountService);

  private readonly subscriptionsService = makeService(SubscriptionsService);

  public async subscribe(
    user: BillingUser,
    offerKey: string,
  ): Promise<SubscriptionCheckout> {
    const { price } = await this.offered(offerKey, "recurring");
    const customer = await this.prepare(user);

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

  private async offered(key: string, type: PriceType): Promise<OfferedPrice> {
    const offered = await this.billingOffersService.findOffered(key);

    if (offered.offer.type !== type) {
      throw new BillingOfferNotFoundError(
        `"${key}" is not sold as ${type === "recurring" ? "a subscription" : "a one-off purchase"}`,
      );
    }

    return offered;
  }

  private async prepare(user: BillingUser): Promise<BillingCustomerEntity> {
    const { plan } = await this.billingAccountService.planOf(user.id);

    if (plan !== "free") {
      throw new AlreadyProError("You already have Pro");
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
