import type { BillingCustomerEntity } from "@/modules/billing-customers";
import type { PurchaseEntity } from "@/modules/purchases";
import type { SubscriptionEntity } from "@/modules/subscriptions";

import type { BillingAccountModel } from "./billing-account.model";
import { planOf } from "./billing-plan";

export interface BillingAccountEntity {
  customer: BillingCustomerEntity | null;
  subscription: SubscriptionEntity | null;
  purchase: PurchaseEntity | null;
}

const addressOf = (customer: BillingCustomerEntity) =>
  [
    customer.addressLine1,
    customer.addressLine2,
    customer.addressCity,
    customer.addressState,
    customer.addressPostalCode,
    customer.addressCountry,
  ].every((part) => part === null)
    ? null
    : {
        line1: customer.addressLine1,
        line2: customer.addressLine2,
        city: customer.addressCity,
        state: customer.addressState,
        postalCode: customer.addressPostalCode,
        country: customer.addressCountry,
      };

export class BillingAccountEntity {
  public static normalize({
    customer,
    subscription,
    purchase,
  }: BillingAccountEntity): BillingAccountModel {
    return {
      ...planOf({ subscription, purchase }),
      subscription: subscription && {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelAt: subscription.cancelAt,
        trialEnd: subscription.trialEnd,
      },
      lifetime: purchase && {
        status: purchase.status,
        amount: purchase.amount,
        amountRefunded: purchase.amountRefunded,
        currency: purchase.currency,
        paidAt: purchase.paidAt,
      },
      customer: customer && {
        name: customer.name,
        email: customer.email,
        address: addressOf(customer),
        card:
          customer.providerPaymentMethodId === null
            ? null
            : { brand: customer.cardBrand, last4: customer.cardLast4 },
      },
    };
  }
}
