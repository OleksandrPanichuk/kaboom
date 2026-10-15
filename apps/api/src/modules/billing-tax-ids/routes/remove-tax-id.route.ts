import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { TAX_IDS_RATE_LIMIT } from "../billing-tax-ids.constants";
import type { BillingTaxIdsActions } from "../billing-tax-ids.routes";
import { TaxIdParams } from "./tax-id-params";

export const removeTaxIdRoute = ({ removeTaxId }: BillingTaxIdsActions) =>
  defineRoute({
    params: TaxIdParams,
    response: t.Object({ removed: t.Literal(true) }),
    summary: "Remove a tax id",
    auth: true,
    rateLimit: {
      ...TAX_IDS_RATE_LIMIT,
      scope: "billing:tax-ids",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user, params }) =>
      removeTaxId.execute({ userId: user.id, taxIdId: params.taxIdId }),
    postAction: () => ({ removed: true as const }),
  });
