import type { LucideIcon } from "lucide-react";

interface SettingsPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function SettingsPageHeader({
  icon,
  title,
  description,
}: SettingsPageHeaderProps) {
  const Icon = icon;

  return (
    <div className="mb-2 flex items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50 text-indigo-700 shadow-sm">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.12em] text-indigo-700 uppercase">
          Account settings
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance">
          {title}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}
