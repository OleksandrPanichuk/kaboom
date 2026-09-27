import { verifyEmailMutation } from "@/features/auth/api";
import { useConsumeToken } from "@/features/auth/hooks";
import { TokenOutcome } from "@/features/auth/ui/components";
import { AuthLayout } from "@/features/auth/ui/layouts";

interface VerifyEmailViewProps {
  token: string | undefined;
}

export function VerifyEmailView({ token }: VerifyEmailViewProps) {
  const verify = useConsumeToken(verifyEmailMutation, token);

  return (
    <AuthLayout
      title="Verify your email"
      description="One click and your address is confirmed."
    >
      <TokenOutcome
        status={verify.status}
        error={verify.error}
        hasToken={Boolean(token)}
        pendingText="Confirming your email…"
        successText="Your email is verified. Thanks!"
        continueLabel="Continue to Kaboom"
      />
    </AuthLayout>
  );
}
