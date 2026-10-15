import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { BillingTaxIdEntity } from "../billing-tax-id.entity";
import { BillingTaxIdModel } from "../billing-tax-ids.model";
import type { BillingTaxIdsActions } from "../billing-tax-ids.routes";

export const listTaxIdsRoute = ({ listTaxIds }: BillingTaxIdsActions) =>
  defineRoute({
    response: t.Array(BillingTaxIdModel),
    summary: "List the tax ids your invoices carry",
    auth: true,

    action: ({ user }) => listTaxIds.execute({ userId: user.id }),
    postAction: ({ output }) => output.map(BillingTaxIdEntity.normalize),
  });
