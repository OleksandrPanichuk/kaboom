import type { AccountPlan } from "@/modules/billing-account";

export type InterviewPeriod = "day" | "week";

export interface PlanEntitlements {
  interviews: { limit: number; per: InterviewPeriod };
  sandboxDesigns: number | null;
  fullReview: boolean;
  replay: boolean;
  voice: boolean;
  priorityTests: boolean;
}

export const ENTITLEMENTS: Readonly<Record<AccountPlan, PlanEntitlements>> = {
  free: {
    interviews: { limit: 1, per: "week" },
    sandboxDesigns: 5,
    fullReview: false,
    replay: false,
    voice: false,
    priorityTests: false,
  },
  pro: {
    interviews: { limit: 3, per: "day" },
    sandboxDesigns: null,
    fullReview: true,
    replay: true,
    voice: true,
    priorityTests: true,
  },
};
