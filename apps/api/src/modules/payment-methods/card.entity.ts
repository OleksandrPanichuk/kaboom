import type { ProviderStoredCard } from "@/modules/billing-provider";

import type { CardModel } from "./payment-methods.model";

export interface CardEntity extends ProviderStoredCard {
  isDefault: boolean;
}

export class CardEntity {
  public static normalize(card: CardEntity): CardModel {
    return {
      id: card.id,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      isDefault: card.isDefault,
    };
  }
}
