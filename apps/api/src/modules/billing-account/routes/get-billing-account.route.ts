import { defineRoute } from "@/core/route";

import { BillingAccountEntity } from "../billing-account.entity";
import { BillingAccountModel } from "../billing-account.model";
import type { BillingAccountActions } from "../billing-account.routes";

export const getBillingAccountRoute = ({
  getBillingAccount,
}: BillingAccountActions) =>
  defineRoute({
    response: BillingAccountModel,
    summary: "Get your plan and billing details",
    description:
      "Your plan and what gives it, your current subscription or lifetime purchase, and the name, address and card the billing provider holds for you. A past-due subscription keeps Pro while the provider retries the payment.",
    auth: true,

    action: ({ user }) => getBillingAccount.execute({ userId: user.id }),
    postAction: ({ output }) => BillingAccountEntity.normalize(output),
  });
