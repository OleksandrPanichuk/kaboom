const FORMAT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatSubmittedAt = (value: string): string =>
  FORMAT.format(new Date(value));
