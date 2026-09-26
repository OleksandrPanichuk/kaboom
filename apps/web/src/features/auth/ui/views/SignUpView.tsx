import { Link } from "@tanstack/react-router";

import { SignUpForm } from "../components/SignUpForm";
import { AuthLayout } from "../layouts/AuthLayout";

interface SignUpViewProps {
  redirect: string | undefined;
  onSignedUp: () => void;
}

export function SignUpView({ redirect, onSignedUp }: SignUpViewProps) {
  return (
    <AuthLayout
      title="Create your account"
      description="Design systems, break them, and learn why."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/sign-in" search={{ redirect }} className="underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm onSignedUp={onSignedUp} />
    </AuthLayout>
  );
}
