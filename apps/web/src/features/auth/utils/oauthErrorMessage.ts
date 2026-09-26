const MESSAGES: Readonly<Record<string, string>> = {
  OAUTH_DENIED: "Sign-in was cancelled at the provider.",
  OAUTH_TRANSACTION_INVALID:
    "That sign-in attempt expired or was started elsewhere. Try again.",
  OAUTH_EMAIL_UNAVAILABLE:
    "The provider did not share a verified email address, which Kaboom needs.",
  ACCOUNT_LINK_REQUIRED:
    "An account with this email already exists. Sign in with your password, then connect the provider in your security settings.",
  ACCOUNT_ALREADY_LINKED:
    "That provider account is already connected to another Kaboom account.",
  OAUTH_PROVIDER_NOT_CONFIGURED: "That provider is not available right now.",
};

export const oauthErrorMessage = (code: string): string =>
  MESSAGES[code] ?? "Signing in with the provider did not work. Try again.";
