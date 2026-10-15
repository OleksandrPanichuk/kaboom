import { CARD_BRAND_NAMES } from "@/features/billing/constants";

export const cardBrandName = (brand: string | null): string =>
  (brand ? CARD_BRAND_NAMES[brand] : undefined) ?? "Card";

export const describeCard = (
  brand: string | null,
  last4: string | null,
): string => `${cardBrandName(brand)} •••• ${last4 ?? "····"}`;
