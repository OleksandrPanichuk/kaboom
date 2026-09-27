import type { LucideIcon } from "lucide-react";

interface PanelPlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PanelPlaceholder({
  icon,
  title,
  description,
}: PanelPlaceholderProps) {
  const Icon = icon;

  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="grid size-9 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm leading-5 text-muted-foreground text-pretty">
        {description}
      </p>
    </div>
  );
}
