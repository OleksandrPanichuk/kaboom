import { Link } from "@tanstack/react-router";

import { ForgotPasswordForm } from "@/features/auth/ui/components";
import { AuthLayout } from "@/features/auth/ui/layouts";

export function ForgotPasswordView() {
  return (
    <AuthLayout
      title="Forgot your password?"
      description="It happens. Tell us where to send the reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/sign-in" className="underline">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
