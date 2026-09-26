import { Link } from "@tanstack/react-router";

import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import { AuthLayout } from "../layouts/AuthLayout";

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
