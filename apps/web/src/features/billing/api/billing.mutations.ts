import { mutationOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import { billingAccountQuery } from "./billing.queries";

export interface StartCheckoutVariables {
  offer: string;
  type: "recurring" | "one_time";
}

export interface BillingDetailsVariables {
  name: string;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    country: string;
  };
}

export const startCheckoutMutation = mutationOptions({
  mutationKey: ["billing", "checkout"],
  mutationFn: async ({ offer, type }: StartCheckoutVariables) =>
    type === "recurring"
      ? {
          clientSecret: unwrap(
            await api.api.billing.checkout.subscription.post({ offer }),
          ).clientSecret,
        }
      : {
          clientSecret: unwrap(
            await api.api.billing.checkout.lifetime.post({ offer }),
          ).clientSecret,
        },
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: billingAccountQuery.queryKey }),
});

export const updateBillingDetailsMutation = mutationOptions({
  mutationKey: ["billing", "details"],
  mutationFn: async (variables: BillingDetailsVariables) =>
    unwrap(await api.api.billing.details.put(variables)),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: billingAccountQuery.queryKey }),
});
