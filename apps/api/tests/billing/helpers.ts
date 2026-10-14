import { billingOffersSchema, getDatabase } from "@/db";

export const OFFERS = [
  {
    key: "pro_monthly",
    planKey: "pro" as const,
    type: "recurring" as const,
    interval: "month" as const,
    intervalCount: 1,
    lookupKey: "pro_monthly",
    position: 1,
  },
  {
    key: "pro_lifetime",
    planKey: "pro" as const,
    type: "one_time" as const,
    interval: null,
    intervalCount: null,
    lookupKey: "pro_lifetime",
    position: 2,
  },
];

export const seedOffers = () =>
  getDatabase().insert(billingOffersSchema).values(OFFERS).returning();
