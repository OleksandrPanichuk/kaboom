import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { BillingOfferModel } from "../billing.model";
import type { BillingActions } from "../billing.routes";
import { BillingOfferEntity } from "../billing-offer.entity";

export const listOffersRoute = ({ listOffers }: BillingActions) =>
  defineRoute({
    response: t.Array(BillingOfferModel),
    summary: "List what is on sale",
    description:
      "Every active offer, such as Pro monthly or Pro for life, with the price the billing provider sells it at, in the offers' own order. An offer whose price has not been synced yet is left out. Free has no offer.",

    action: () => listOffers.execute(),
    postAction: ({ output }) => output.map(BillingOfferEntity.normalize),
  });
