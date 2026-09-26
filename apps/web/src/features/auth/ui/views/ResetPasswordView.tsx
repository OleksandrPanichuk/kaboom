import { Link } from "@tanstack/react-router";

import { ResetPasswordForm } from "@/features/auth/ui/components";
import { AuthLayout } from "@/features/auth/ui/layouts";

interface ResetPasswordViewProps {
  token: string | undefined;
}

export function ResetPasswordView({ token }: ResetPasswordViewProps) {
  return (
    <AuthLayout
      title="Choose a new password"
      description="Pick something you have not used here before."
      footer={
        <>
          Link not working?{" "}
          <Link to="/forgot-password" className="underline">
            Ask for a new one
          </Link>
        </>
      }
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-center text-sm text-destructive">
          This link is missing its token. Open it again from the email, or ask
          for a new one.
        </p>
      )}
    </AuthLayout>
  );
}
