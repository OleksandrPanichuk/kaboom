import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

const fetchBillingAccount = async () => unwrap(await api.api.billing.me.get());

export type BillingAccount = Awaited<ReturnType<typeof fetchBillingAccount>>;

export const billingAccountQuery = queryOptions({
  queryKey: ["billing", "account"],
  queryFn: fetchBillingAccount,
});

export const offersQuery = queryOptions({
  queryKey: ["billing", "offers"],
  queryFn: async () => unwrap(await api.api.billing.offers.get()),
  staleTime: 5 * 60 * 1000,
});
