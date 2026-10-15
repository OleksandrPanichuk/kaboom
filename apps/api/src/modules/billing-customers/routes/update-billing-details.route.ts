import { defineRoute } from "@/core/route";

import { BillingCustomerEntity } from "../billing-customer.entity";
import { BILLING_DETAILS_RATE_LIMIT } from "../billing-customers.constants";
import { BillingCustomerModel } from "../billing-customers.model";
import type { BillingCustomersActions } from "../billing-customers.routes";
import { UpdateBillingDetailsInput } from "../dto";

const optional = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
};

export const updateBillingDetailsRoute = ({
  updateBillingDetails,
}: BillingCustomersActions) =>
  defineRoute({
    body: UpdateBillingDetailsInput,
    response: BillingCustomerModel,
    summary: "Set the name and address your invoices carry",
    description:
      "Saved at the billing provider, which prints them on every invoice from now on and, when tax is collected, works tax out from the country. Answers 422 BILLING_DETAILS_REJECTED when the provider refuses the address.",
    auth: true,
    rateLimit: {
      ...BILLING_DETAILS_RATE_LIMIT,
      scope: "billing:details",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user, body }) =>
      updateBillingDetails.execute({
        userId: user.id,
        name: body.name.trim(),
        address: {
          line1: body.address.line1.trim(),
          line2: optional(body.address.line2),
          city: body.address.city.trim(),
          state: optional(body.address.state),
          postalCode: optional(body.address.postalCode),
          country: body.address.country,
        },
      }),
    postAction: ({ output }) => BillingCustomerEntity.normalize(output),
  });
