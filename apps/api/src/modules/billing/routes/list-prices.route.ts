import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { BillingPriceModel } from "../billing.model";
import type { BillingActions } from "../billing.routes";
import { BillingPriceEntity } from "../billing-price.entity";

export const listPricesRoute = ({ listPrices }: BillingActions) =>
  defineRoute({
    response: t.Array(BillingPriceModel),
    summary: "List the prices on offer",
    description:
      "The prices Pro is sold at, monthly and lifetime, as synced from Stripe when the app starts. Free has no price.",

    action: () => listPrices.execute(),
    postAction: ({ output }) => output.map(BillingPriceEntity.normalize),
  });
