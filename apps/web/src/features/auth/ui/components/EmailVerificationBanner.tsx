import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";

import { sendEmailVerificationTokenMutation } from "../../api/auth.mutations";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { errorMessage } from "../../utils/errorMessage";

export function EmailVerificationBanner() {
  const user = useCurrentUser();
  const resend = useMutation(sendEmailVerificationTokenMutation);

  if (user.emailVerified) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2 text-sm sm:px-6">
      <p className="min-w-0 break-words">
        {resend.isSuccess ? (
          <>
            A new link is on its way to{" "}
            <span className="font-medium">{user.email}</span>.
          </>
        ) : resend.isError ? (
          <span className="text-destructive">{errorMessage(resend.error)}</span>
        ) : (
          <>
            Confirm <span className="font-medium">{user.email}</span> with the
            link we sent you.
          </>
        )}
      </p>
      {resend.isSuccess ? null : (
        <Button
          variant="outline"
          size="sm"
          disabled={resend.isPending}
          onClick={() => resend.mutate({ email: user.email })}
        >
          {resend.isPending ? "Sending…" : "Send it again"}
        </Button>
      )}
    </div>
  );
}
