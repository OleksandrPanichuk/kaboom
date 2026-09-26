import type { OAuthProvider } from "../../../typedefs/auth.typedefs";

export const OAUTH_PROVIDERS: ReadonlyArray<{
  provider: OAuthProvider;
  label: string;
}> = [
  { provider: "google", label: "Continue with Google" },
  { provider: "github", label: "Continue with GitHub" },
];
