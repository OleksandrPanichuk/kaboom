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

const BILLING_KEY = ["billing"] as const;

export interface CardVariables {
  cardId: string;
}

export interface AddTaxIdVariables {
  type: string;
  value: string;
}

export interface RemoveTaxIdVariables {
  taxIdId: string;
}

export const cancelSubscriptionMutation = mutationOptions({
  mutationKey: ["billing", "cancel"],
  mutationFn: async () =>
    unwrap(await api.api.billing.subscription.cancel.post()),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: BILLING_KEY }),
});

export const resumeSubscriptionMutation = mutationOptions({
  mutationKey: ["billing", "resume"],
  mutationFn: async () =>
    unwrap(await api.api.billing.subscription.resume.post()),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: BILLING_KEY }),
});

export const setUpCardMutation = mutationOptions({
  mutationKey: ["billing", "card-setup"],
  mutationFn: async () => unwrap(await api.api.billing.cards.setup.post()),
});

export const makeCardDefaultMutation = mutationOptions({
  mutationKey: ["billing", "card-default"],
  mutationFn: async ({ cardId }: CardVariables) =>
    unwrap(await api.api.billing.cards(cardId).default.put()),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: BILLING_KEY }),
});

export const removeCardMutation = mutationOptions({
  mutationKey: ["billing", "card-remove"],
  mutationFn: async ({ cardId }: CardVariables) =>
    unwrap(await api.api.billing.cards(cardId).delete()),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: BILLING_KEY }),
});

export const addTaxIdMutation = mutationOptions({
  mutationKey: ["billing", "tax-id-add"],
  mutationFn: async (variables: AddTaxIdVariables) =>
    unwrap(await api.api.billing.taxIds.post(variables)),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: BILLING_KEY }),
});

export const removeTaxIdMutation = mutationOptions({
  mutationKey: ["billing", "tax-id-remove"],
  mutationFn: async ({ taxIdId }: RemoveTaxIdVariables) =>
    unwrap(await api.api.billing.taxIds(taxIdId).delete()),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: BILLING_KEY }),
});
