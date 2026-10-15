import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

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

export const cardsQuery = queryOptions({
  queryKey: ["billing", "cards"],
  queryFn: async () => unwrap(await api.api.billing.cards.get()),
});

export const taxIdsQuery = queryOptions({
  queryKey: ["billing", "tax-ids"],
  queryFn: async () => unwrap(await api.api.billing.taxIds.get()),
});

export const invoicesQuery = infiniteQueryOptions({
  queryKey: ["billing", "invoices"],
  queryFn: async ({ pageParam }) =>
    unwrap(
      await api.api.billing.invoices.get({
        query: pageParam === null ? {} : { cursor: pageParam },
      }),
    ),
  initialPageParam: null as string | null,
  getNextPageParam: (page) => page.nextCursor,
});
