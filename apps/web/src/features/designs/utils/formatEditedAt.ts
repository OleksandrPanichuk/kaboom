const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const formatEditedAt = (value: string, now = new Date()): string => {
  const date = new Date(value);
  const elapsed = now.getTime() - date.getTime();

  if (elapsed < MINUTE) return "Edited just now";
  if (elapsed < HOUR) {
    return `Edited ${relative.format(-Math.floor(elapsed / MINUTE), "minute")}`;
  }
  if (elapsed < DAY) {
    return `Edited ${relative.format(-Math.floor(elapsed / HOUR), "hour")}`;
  }
  if (elapsed < 7 * DAY) {
    return `Edited ${relative.format(-Math.floor(elapsed / DAY), "day")}`;
  }

  const sameYear = date.getFullYear() === now.getFullYear();

  return `Edited ${date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })}`;
};
