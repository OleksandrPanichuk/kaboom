import { WEEK_MS } from "./practice-plans.constants";

export const weekStartOf = (at: Date): string => {
  const day = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
  );
  const sinceMonday = (day.getUTCDay() + 6) % 7;

  day.setUTCDate(day.getUTCDate() - sinceMonday);

  return day.toISOString().slice(0, 10);
};

export const weekBounds = (weekStart: string): { from: Date; to: Date } => {
  const from = new Date(`${weekStart}T00:00:00.000Z`);

  return { from, to: new Date(from.getTime() + WEEK_MS) };
};
