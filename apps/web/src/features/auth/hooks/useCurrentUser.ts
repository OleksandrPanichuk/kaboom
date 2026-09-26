import type { UserModel } from "@repo/api-client";
import { useSuspenseQuery } from "@tanstack/react-query";

import { currentUserQuery } from "@/features/auth/api";

export const useCurrentUser = (): UserModel => {
  const { data } = useSuspenseQuery(currentUserQuery);

  if (!data) throw new Error("useCurrentUser needs a signed-in user");

  return data;
};
