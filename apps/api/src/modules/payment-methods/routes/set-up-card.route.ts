import { defineRoute } from "@/core/route";

import { CARDS_RATE_LIMIT } from "../payment-methods.constants";
import { CardSetupModel } from "../payment-methods.model";
import type { PaymentMethodsActions } from "../payment-methods.routes";

export const setUpCardRoute = ({ setUpCard }: PaymentMethodsActions) =>
  defineRoute({
    response: CardSetupModel,
    summary: "Start adding a card",
    description:
      "Answers the secret the provider's payment form saves a card with, for later payments. Once saved, the card is listed; make it the default to have renewals charged to it.",
    auth: true,
    rateLimit: {
      ...CARDS_RATE_LIMIT,
      scope: "billing:cards",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user }) => setUpCard.execute({ userId: user.id }),
    postAction: ({ output }) => ({ clientSecret: output }),
  });
