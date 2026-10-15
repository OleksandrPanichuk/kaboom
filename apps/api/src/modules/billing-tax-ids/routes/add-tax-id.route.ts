import { defineRoute } from "@/core/route";

import { BillingTaxIdEntity } from "../billing-tax-id.entity";
import { TAX_IDS_RATE_LIMIT } from "../billing-tax-ids.constants";
import { BillingTaxIdModel } from "../billing-tax-ids.model";
import type { BillingTaxIdsActions } from "../billing-tax-ids.routes";
import { AddTaxIdInput } from "../dto";

export const addTaxIdRoute = ({ addTaxId }: BillingTaxIdsActions) =>
  defineRoute({
    body: AddTaxIdInput,
    response: BillingTaxIdModel,
    summary: "Add a tax id, such as a VAT number",
    description:
      "Saved at the billing provider and printed on invoices from now on. The provider checks it in the background, and its verification status follows. Answers 422 BILLING_DETAILS_REJECTED when the provider refuses the number.",
    auth: true,
    rateLimit: {
      ...TAX_IDS_RATE_LIMIT,
      scope: "billing:tax-ids",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user, body }) =>
      addTaxId.execute({
        userId: user.id,
        type: body.type,
        value: body.value.trim(),
      }),
    postAction: ({ output }) => BillingTaxIdEntity.normalize(output),
  });
