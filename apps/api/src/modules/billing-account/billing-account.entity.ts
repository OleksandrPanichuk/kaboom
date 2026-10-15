import { BillingCustomerEntity } from "@/modules/billing-customers";
import type { PurchaseEntity } from "@/modules/purchases";
import { SubscriptionEntity } from "@/modules/subscriptions";

import type { BillingAccountModel } from "./billing-account.model";
import { planOf } from "./billing-plan";

export interface BillingAccountEntity {
  customer: BillingCustomerEntity | null;
  subscription: SubscriptionEntity | null;
  purchase: PurchaseEntity | null;
}

export class BillingAccountEntity {
  public static normalize({
    customer,
    subscription,
    purchase,
  }: BillingAccountEntity): BillingAccountModel {
    return {
      ...planOf({ subscription, purchase }),
      subscription: subscription && SubscriptionEntity.normalize(subscription),
      lifetime: purchase && {
        status: purchase.status,
        amount: purchase.amount,
        amountRefunded: purchase.amountRefunded,
        currency: purchase.currency,
        paidAt: purchase.paidAt,
      },
      customer: customer && BillingCustomerEntity.normalize(customer),
    };
  }
}
