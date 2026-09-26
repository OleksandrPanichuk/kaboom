import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "danger";
}

export function SettingsSection({
  title,
  description,
  children,
  tone = "default",
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-6",
        tone === "danger" && "border-destructive/40",
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
