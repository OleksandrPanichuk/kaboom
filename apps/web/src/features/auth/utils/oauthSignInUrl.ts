import type { OAuthProvider } from "@/features/auth/typedefs";

import { safeRedirect } from "./safeRedirect";

export const oauthSignInUrl = (
  provider: OAuthProvider,
  redirect: string | undefined,
): string => {
  const returnTo = `/sign-in?redirect=${encodeURIComponent(safeRedirect(redirect))}`;

  return `/api/auth/oauth/${provider}?redirectTo=${encodeURIComponent(returnTo)}`;
};
