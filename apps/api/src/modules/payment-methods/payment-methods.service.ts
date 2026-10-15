import { make, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import {
  type BillingCustomerEntity,
  BillingCustomersService,
  type BillingUser,
} from "@/modules/billing-customers";
import { BillingProvider } from "@/modules/billing-provider";
import { SubscriptionsService } from "@/modules/subscriptions";

import type { CardEntity } from "./card.entity";
import { CHARGING_SUBSCRIPTION_STATUSES } from "./payment-methods.constants";
import { CardInUseError, CardNotFoundError } from "./payment-methods.errors";

export class PaymentMethodsService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  private readonly subscriptionsService = makeService(SubscriptionsService);

  public async setup(user: BillingUser): Promise<string> {
    const customer = await this.billingCustomersService.forUser(user);

    return this.provider.createCardSetup(customer.providerCustomerId);
  }

  public async list(userId: string): Promise<CardEntity[]> {
    const customer = await this.billingCustomersService.findForUser(userId);

    return customer ? this.cardsOf(customer) : [];
  }

  public async makeDefault(
    userId: string,
    cardId: string,
  ): Promise<CardEntity[]> {
    const customer = await this.owning(userId, cardId);
    const updated = await this.billingCustomersService.record(
      await this.provider.setDefaultCard(customer.providerCustomerId, cardId),
    );

    return this.cardsOf(updated);
  }

  public async remove(userId: string, cardId: string): Promise<CardEntity[]> {
    const customer = await this.owning(userId, cardId);

    if (customer.providerPaymentMethodId === cardId) {
      const subscription = await this.subscriptionsService.currentFor(userId);

      if (
        subscription &&
        !subscription.cancelAtPeriodEnd &&
        CHARGING_SUBSCRIPTION_STATUSES.includes(subscription.status)
      ) {
        throw new CardInUseError(
          "Your subscription renews on this card; make another card the default first",
        );
      }
    }

    await this.provider.removeCard(cardId);

    const updated = await this.billingCustomersService.sync(
      customer.providerCustomerId,
    );

    return updated ? this.cardsOf(updated) : [];
  }

  private async owning(
    userId: string,
    cardId: string,
  ): Promise<BillingCustomerEntity> {
    const customer = await this.billingCustomersService.findForUser(userId);
    const cards = customer
      ? await this.provider.listCards(customer.providerCustomerId)
      : [];

    if (!customer || !cards.some((card) => card.id === cardId)) {
      throw new CardNotFoundError("You have no such card");
    }

    return customer;
  }

  private async cardsOf(
    customer: BillingCustomerEntity,
  ): Promise<CardEntity[]> {
    const cards = await this.provider.listCards(customer.providerCustomerId);

    return cards.map((card) => ({
      ...card,
      isDefault: card.id === customer.providerPaymentMethodId,
    }));
  }
}
