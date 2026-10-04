import type { TechnologyDefinition } from "@repo/design";
import { cn } from "cn";

import { PROVIDER_COLORS, TECHNOLOGY_ICONS } from "@/features/canvas/constants";
import { markColor } from "@/features/canvas/utils";

interface TechnologyMarkProps {
  technology: Pick<TechnologyDefinition, "icon" | "monogram" | "provider">;
  className?: string;
}

export function TechnologyMark({ technology, className }: TechnologyMarkProps) {
  const icon = technology.icon ? TECHNOLOGY_ICONS[technology.icon] : undefined;

  if (icon) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill={markColor(icon.hex, PROVIDER_COLORS[technology.provider])}
        className={cn("size-4 shrink-0", className)}
      >
        <path d={icon.path} />
      </svg>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ color: PROVIDER_COLORS[technology.provider] }}
      className={cn(
        "inline-grid h-4 min-w-4 shrink-0 place-items-center text-[9px] leading-none font-bold tracking-tight",
        className,
      )}
    >
      {technology.monogram}
    </span>
  );
}
