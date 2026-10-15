import { CreditCard } from "lucide-react";

import { CARD_BRAND_ICONS } from "@/features/billing/constants";

interface CardMarkProps {
  brand: string | null;
}

export function CardMark({ brand }: CardMarkProps) {
  const icon = brand ? CARD_BRAND_ICONS[brand] : undefined;

  return (
    <span
      aria-hidden="true"
      className="grid h-8 w-12 shrink-0 place-items-center rounded-md border border-border shadow-xs"
      style={{ backgroundColor: icon ? "#ffffff" : undefined }}
    >
      {icon ? (
        <svg viewBox="0 0 24 24" className="size-6" fill={`#${icon.hex}`}>
          <path d={icon.path} />
        </svg>
      ) : (
        <CreditCard className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}
