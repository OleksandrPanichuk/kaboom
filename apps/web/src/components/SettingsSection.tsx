import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  icon: LucideIcon;
  tone?: "default" | "danger";
}

export function SettingsSection({
  title,
  description,
  children,
  icon,
  tone = "default",
}: SettingsSectionProps) {
  const Icon = icon;

  return (
    <section
      className={cn(
        "grid gap-5 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-6 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:gap-8",
        tone === "danger" && "border-destructive/20 bg-destructive/[0.025]",
      )}
    >
      <div className="flex items-start gap-3 md:flex-col">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700",
            tone === "danger" && "bg-destructive/10 text-destructive",
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-semibold tracking-[-0.02em]">{title}</h2>
          <p className="text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
