const PERIOD_LABEL = { day: "today", week: "this week" } as const;

export interface InterviewAllowance {
  limit: number;
  per: "day" | "week";
  used: number;
  resetsAt: string;
}

export const allowanceLeft = ({ limit, used }: InterviewAllowance): number =>
  Math.max(0, limit - used);

export const describeAllowance = (quota: InterviewAllowance): string => {
  const left = allowanceLeft(quota);
  const period = PERIOD_LABEL[quota.per];

  if (left === 0) {
    return `You have used ${period}'s ${quota.limit === 1 ? "interview" : "interviews"}.`;
  }

  return `${left} of ${quota.limit} ${quota.limit === 1 ? "interview" : "interviews"} left ${period}.`;
};

export const formatReset = (resetsAt: string): string =>
  new Date(resetsAt).toLocaleDateString("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
