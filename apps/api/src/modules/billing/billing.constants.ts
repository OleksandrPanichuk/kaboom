import type { PlanKey, PriceType } from "@/db";

export interface PriceOffer {
  lookupKey: string;
  planKey: PlanKey;
  type: PriceType;
}
