import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { BillingOfferEntity } from "../billing-offer.entity";
import { BillingOfferModel } from "../billing-offers.model";
import type { BillingOffersActions } from "../billing-offers.routes";

export const listOffersRoute = ({ listOffers }: BillingOffersActions) =>
  defineRoute({
    response: t.Array(BillingOfferModel),
    summary: "List what is on sale",
    description:
      "Every active offer, such as Pro monthly or Pro for life, with the price the billing provider sells it at, in the offers' own order. An offer whose price has not been synced yet is left out. Free has no offer.",

    action: () => listOffers.execute(),
    postAction: ({ output }) => output.map(BillingOfferEntity.normalize),
  });
