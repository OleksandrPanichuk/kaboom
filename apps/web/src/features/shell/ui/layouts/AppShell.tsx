import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/Sidebar";
import { EmailVerificationBanner } from "@/features/auth";
import { useSidebarStore } from "@/features/shell/store";
import { AppSidebar, ShellHeader } from "@/features/shell/ui/components";

interface AppShellProps {
  children: ReactNode;
  onSignedOut: () => void;
}

export function AppShell({ children, onSignedOut }: AppShellProps) {
  const open = useSidebarStore((state) => state.open);
  const setOpen = useSidebarStore((state) => state.setOpen);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AppSidebar onSignedOut={onSignedOut} />
      <SidebarInset className="min-w-0">
        <ShellHeader />
        <EmailVerificationBanner />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
