import { DAY, WEEK } from "@/constants";
import type { InterviewPeriod } from "@/modules/entitlements";

export interface QuotaWindow {
  from: Date;
  resetsAt: Date;
}

export const quotaWindow = (per: InterviewPeriod, now: Date): QuotaWindow => {
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  if (per === "day") {
    return { from: day, resetsAt: new Date(day.getTime() + DAY) };
  }

  const sinceMonday = (day.getUTCDay() + 6) % 7;
  const from = new Date(day.getTime() - sinceMonday * DAY);

  return { from, resetsAt: new Date(from.getTime() + WEEK) };
};
