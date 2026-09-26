const BROWSERS: ReadonlyArray<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: ReadonlyArray<[RegExp, string]> = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Windows/, "Windows"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

const first = (
  userAgent: string,
  rules: ReadonlyArray<[RegExp, string]>,
): string | undefined =>
  rules.find(([pattern]) => pattern.test(userAgent))?.[1];

export const describeUserAgent = (userAgent: string | null): string => {
  if (!userAgent) return "Unknown device";

  const browser = first(userAgent, BROWSERS);
  const system = first(userAgent, SYSTEMS);

  if (browser && system) return `${browser} on ${system}`;

  return browser ?? system ?? "Unknown device";
};
