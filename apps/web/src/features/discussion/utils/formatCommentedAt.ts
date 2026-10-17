const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const DATE = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const formatCommentedAt = (value: string, now = Date.now()): string => {
  const minutes = (new Date(value).getTime() - now) / 60_000;
  const hours = minutes / 60;
  const days = hours / 24;

  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) {
    return RELATIVE.format(Math.round(minutes), "minute");
  }
  if (Math.abs(hours) < 24) return RELATIVE.format(Math.round(hours), "hour");
  if (Math.abs(days) < 7) return RELATIVE.format(Math.round(days), "day");
  if (Math.abs(days) < 30) {
    return RELATIVE.format(Math.round(days / 7), "week");
  }

  return DATE.format(new Date(value));
};
