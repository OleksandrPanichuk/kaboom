export const FREE_FEATURES = [
  "Every problem and track",
  "Mock interviews within the daily limit",
  "Reviews of your interviews and submissions",
];

export const PRO_FEATURES = [
  "Everything in Free",
  "More interview time every day",
  "Support the platform as it grows",
];

export interface PlanComparisonRow {
  feature: string;
  free: boolean | string;
  pro: boolean | string;
}

export const PLAN_COMPARISON: readonly PlanComparisonRow[] = [
  { feature: "Problems and tracks", free: "All", pro: "All" },
  { feature: "Challenge reviews", free: true, pro: true },
  { feature: "Mock interviews", free: "Daily limit", pro: "More every day" },
  { feature: "Interview reviews", free: true, pro: true },
  { feature: "Leaderboard and profile", free: true, pro: true },
  { feature: "Supports the platform", free: false, pro: true },
];

export const PLAN_QUESTIONS = [
  {
    question: "Can I cancel any time?",
    answer:
      "Yes. Cancel from your billing settings and you keep Pro until the period you paid for ends. Nothing more is charged.",
  },
  {
    question: "What does lifetime mean?",
    answer:
      "One payment and Pro stays on your account for good, with no renewals. If you are on the monthly plan, it ends the moment lifetime is paid.",
  },
  {
    question: "What happens to my work on Free?",
    answer:
      "Nothing. Your designs, submissions and reviews stay yours whatever plan you are on.",
  },
  {
    question: "Is my card safe?",
    answer:
      "Card details go straight to our payment provider and never reach our servers. Invoices are in your billing settings.",
  },
] as const;

export const CHECKOUT_POLL_MS = 2_000;

export const CHECKOUT_POLL_LIMIT_MS = 60_000;

export const BILLING_BANNER_HIDDEN_ON = ["/pricing", "/settings/billing"];
