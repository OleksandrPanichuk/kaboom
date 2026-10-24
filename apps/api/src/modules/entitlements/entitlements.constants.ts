import type { AccountPlan } from "@/modules/billing-account";

export type InterviewPeriod = "day" | "week";

export interface PlanEntitlements {
  interviews: { limit: number; per: InterviewPeriod };
  fullReview: boolean;
  replay: boolean;
  voice: boolean;
}

export const ENTITLEMENTS: Readonly<Record<AccountPlan, PlanEntitlements>> = {
  free: {
    interviews: { limit: 1, per: "week" },
    fullReview: false,
    replay: false,
    voice: false,
  },
  pro: {
    interviews: { limit: 3, per: "day" },
    fullReview: true,
    replay: true,
    voice: true,
  },
};
