import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";

import { signOutMutation } from "../../api/auth.mutations";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { EmailVerificationBanner } from "../components/EmailVerificationBanner";

interface AppLayoutProps {
  children: ReactNode;
  onSignedOut: () => void;
}

export function AppLayout({ children, onSignedOut }: AppLayoutProps) {
  const user = useCurrentUser();
  const signOut = useMutation(signOutMutation);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link to="/" className="font-semibold tracking-tight">
          Kaboom
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user.name}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={signOut.isPending}
            onClick={() =>
              signOut.mutate(undefined, { onSettled: onSignedOut })
            }
          >
            Sign out
          </Button>
        </div>
      </header>
      <EmailVerificationBanner />
      <div className="flex-1">{children}</div>
    </div>
  );
}
