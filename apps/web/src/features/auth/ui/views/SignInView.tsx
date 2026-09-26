import { Link } from "@tanstack/react-router";

import { FieldError, FieldSeparator } from "@/components/ui/Field";
import { OAuthButtons, SignInForm } from "@/features/auth/ui/components";
import { AuthLayout } from "@/features/auth/ui/layouts";
import { oauthErrorMessage } from "@/features/auth/utils";

interface SignInViewProps {
  redirect: string | undefined;
  oauthError: string | undefined;
  onSignedIn: () => void;
}

export function SignInView({
  redirect,
  oauthError,
  onSignedIn,
}: SignInViewProps) {
  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to continue practising."
      footer={
        <>
          No account yet?{" "}
          <Link to="/sign-up" search={{ redirect }} className="underline">
            Create one
          </Link>
        </>
      }
    >
      {oauthError ? (
        <FieldError className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          {oauthErrorMessage(oauthError)}
        </FieldError>
      ) : null}
      <SignInForm onSignedIn={onSignedIn} />
      <FieldSeparator className="my-6">or</FieldSeparator>
      <OAuthButtons redirect={redirect} />
    </AuthLayout>
  );
}
