export const FREE_FEATURES = [
  "Every problem and track, with scores and a leaderboard place",
  "One AI interview a week, scored on every rubric item",
  "Five designs of your own",
  "Reviews of your challenge submissions",
];

export const PRO_FEATURES = [
  "Everything in Free",
  "Up to three AI interviews a day",
  "As many designs of your own as you like",
  "Every review explained, with the moments it rests on",
  "Replay of every interview, conversation and canvas in step",
  "Talk to the interviewer and hear the answers, hands free",
  "Your design tests go to the front when the servers are busy",
];

export interface PlanComparisonRow {
  feature: string;
  free: boolean | string;
  pro: boolean | string;
}

export const PLAN_COMPARISON: readonly PlanComparisonRow[] = [
  { feature: "Problems and tracks", free: "All", pro: "All" },
  { feature: "Challenge scores and reviews", free: true, pro: true },
  { feature: "Leaderboard and profile", free: true, pro: true },
  { feature: "Writing and sharing problems", free: true, pro: true },
  { feature: "AI interviews", free: "1 a week", pro: "3 a day" },
  { feature: "Designs of your own", free: "5", pro: "Unlimited" },
  { feature: "Interview score on every rubric item", free: true, pro: true },
  {
    feature: "Why each item scored as it did, with evidence",
    free: false,
    pro: true,
  },
  { feature: "Interview replay", free: false, pro: true },
  { feature: "Voice interviews", free: false, pro: true },
  { feature: "Design tests first in line when busy", free: false, pro: true },
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
