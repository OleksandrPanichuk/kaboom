import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { CardEntity } from "../card.entity";
import { CARDS_RATE_LIMIT } from "../payment-methods.constants";
import { CardModel } from "../payment-methods.model";
import type { PaymentMethodsActions } from "../payment-methods.routes";
import { CardParams } from "./card-params";

export const makeCardDefaultRoute = ({
  makeCardDefault,
}: PaymentMethodsActions) =>
  defineRoute({
    params: CardParams,
    response: t.Array(CardModel),
    summary: "Make a card the default",
    description:
      "Invoices and renewals, a subscription's included, are charged to it from now on. Answers your cards as they are after it, or 404 BILLING_CARD_NOT_FOUND when it is not yours.",
    auth: true,
    rateLimit: {
      ...CARDS_RATE_LIMIT,
      scope: "billing:cards",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user, params }) =>
      makeCardDefault.execute({ userId: user.id, cardId: params.cardId }),
    postAction: ({ output }) => output.map(CardEntity.normalize),
  });
