const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const timeLeft = (endsAt: string, now: number = Date.now()): string => {
  const left = new Date(endsAt).getTime() - now;

  if (left <= 0) return "Ends now";

  if (left >= DAY) {
    const days = Math.floor(left / DAY);

    return `${days} ${days === 1 ? "day" : "days"} left`;
  }

  if (left >= HOUR) {
    const hours = Math.floor(left / HOUR);

    return `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  }

  return "Less than an hour left";
};
