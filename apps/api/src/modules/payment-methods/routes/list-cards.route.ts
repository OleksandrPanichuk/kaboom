import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { CardEntity } from "../card.entity";
import { CardModel } from "../payment-methods.model";
import type { PaymentMethodsActions } from "../payment-methods.routes";

export const listCardsRoute = ({ listCards }: PaymentMethodsActions) =>
  defineRoute({
    response: t.Array(CardModel),
    summary: "List your saved cards",
    description:
      "Read from the billing provider as they are now, with the one invoices are charged to marked as the default.",
    auth: true,

    action: ({ user }) => listCards.execute({ userId: user.id }),
    postAction: ({ output }) => output.map(CardEntity.normalize),
  });
