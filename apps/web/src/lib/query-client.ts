import { QueryClient } from "@tanstack/react-query";

import { ApiRequestError } from "./api";

const MAX_RETRIES = 1;

const shouldRetry = (failures: number, error: unknown): boolean =>
  failures < MAX_RETRIES &&
  !(error instanceof ApiRequestError && error.status < 500);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
  },
});
