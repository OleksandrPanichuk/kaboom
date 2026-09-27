import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type { TokenVariables } from "@/features/auth/api";

export const useConsumeToken = <Data>(
  options: UseMutationOptions<Data, Error, TokenVariables>,
  token: string | undefined,
) => {
  const mutation = useMutation(options);
  const consumed = useRef<string | null>(null);
  const { mutate } = mutation;

  useEffect(() => {
    if (!token || consumed.current === token) return;

    consumed.current = token;
    mutate({ token });
  }, [mutate, token]);

  return mutation;
};
