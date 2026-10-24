import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/Button";

interface UpgradeNoticeProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function UpgradeNotice({
  title,
  children,
  className,
}: UpgradeNoticeProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-interactive-border/60 bg-interactive-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="flex items-center gap-2 font-semibold text-interactive-foreground">
          <Sparkles aria-hidden="true" className="size-4 shrink-0" />
          {title}
        </h2>
        <p className="text-sm leading-6 text-subtle-foreground text-pretty">
          {children}
        </p>
      </div>
      <Link
        to="/pricing"
        className={cn(
          buttonVariants({ size: "sm" }),
          "shrink-0 self-start sm:self-auto",
        )}
      >
        See Pro
      </Link>
    </section>
  );
}
