const FORMAT = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatLockedUntil = (value: string): string =>
  FORMAT.format(new Date(value));
