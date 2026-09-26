import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth/utils";
import { cn } from "@/lib/utils";

interface TokenOutcomeProps {
  status: "idle" | "pending" | "success" | "error";
  error: unknown;
  hasToken: boolean;
  pendingText: string;
  successText: string;
  continueLabel: string;
}

export function TokenOutcome({
  status,
  error,
  hasToken,
  pendingText,
  successText,
  continueLabel,
}: TokenOutcomeProps) {
  if (!hasToken) {
    return (
      <p className="text-center text-sm text-destructive">
        This link is missing its token. Open it again from the email.
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center text-sm text-destructive">
          {errorMessage(error)}
        </p>
        <Link to="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Go to Kaboom
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border bg-muted/40 p-4 text-center text-sm">
          {successText}
        </p>
        <Link to="/" className={cn(buttonVariants())}>
          {continueLabel}
        </Link>
      </div>
    );
  }

  return (
    <p className="text-center text-sm text-muted-foreground">{pendingText}</p>
  );
}
