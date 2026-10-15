import type { ReactNode } from "react";

import {
  MarketingFooter,
  MarketingHeader,
} from "@/features/marketing/ui/components";

interface MarketingLayoutProps {
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground [color-scheme:dark]">
      <MarketingHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <MarketingFooter />
    </div>
  );
}
