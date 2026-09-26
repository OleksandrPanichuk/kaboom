import { confirmEmailChangeMutation } from "../../api/auth.mutations";
import { useConsumeToken } from "../../hooks/useConsumeToken";
import { TokenOutcome } from "../components/TokenOutcome";
import { AuthLayout } from "../layouts/AuthLayout";

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
