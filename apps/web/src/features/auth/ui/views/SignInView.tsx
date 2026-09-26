import { Link } from "@tanstack/react-router";

import { SignInForm } from "../components/SignInForm";
import { AuthLayout } from "../layouts/AuthLayout";

interface SignInViewProps {
  redirect: string | undefined;
  onSignedIn: () => void;
}

export function SignInView({ redirect, onSignedIn }: SignInViewProps) {
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
      <SignInForm onSignedIn={onSignedIn} />
    </AuthLayout>
  );
}
