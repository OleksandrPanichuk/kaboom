import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { CardEntity } from "../card.entity";
import { CARDS_RATE_LIMIT } from "../payment-methods.constants";
import { CardModel } from "../payment-methods.model";
import type { PaymentMethodsActions } from "../payment-methods.routes";
import { CardParams } from "./card-params";

export const removeCardRoute = ({ removeCard }: PaymentMethodsActions) =>
  defineRoute({
    params: CardParams,
    response: t.Array(CardModel),
    summary: "Remove a saved card",
    description:
      "Refused with 409 BILLING_CARD_IN_USE for the default card while a subscription renews on it. Answers your cards as they are after it, or 404 BILLING_CARD_NOT_FOUND when it is not yours.",
    auth: true,
    rateLimit: {
      ...CARDS_RATE_LIMIT,
      scope: "billing:cards",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user, params }) =>
      removeCard.execute({ userId: user.id, cardId: params.cardId }),
    postAction: ({ output }) => output.map(CardEntity.normalize),
  });
