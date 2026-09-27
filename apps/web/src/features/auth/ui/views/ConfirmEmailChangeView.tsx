import { confirmEmailChangeMutation } from "@/features/auth/api";
import { useConsumeToken } from "@/features/auth/hooks";
import { TokenOutcome } from "@/features/auth/ui/components";
import { AuthLayout } from "@/features/auth/ui/layouts";

interface ConfirmEmailChangeViewProps {
  token: string | undefined;
}

export function ConfirmEmailChangeView({ token }: ConfirmEmailChangeViewProps) {
  const confirm = useConsumeToken(confirmEmailChangeMutation, token);

  return (
    <AuthLayout
      title="Confirm your new email"
      description="Your account moves to this address once you confirm it."
    >
      <TokenOutcome
        status={confirm.status}
        error={confirm.error}
        hasToken={Boolean(token)}
        pendingText="Moving your account to this address…"
        successText="Done. Sign in with this email from now on."
        continueLabel="Continue to Kaboom"
      />
    </AuthLayout>
  );
}
