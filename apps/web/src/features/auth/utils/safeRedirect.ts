const PROBE_ORIGIN = "http://kaboom.invalid";

export const DEFAULT_REDIRECT = "/";

export const safeRedirect = (value: unknown): string => {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return DEFAULT_REDIRECT;
  }

  try {
    const url = new URL(value, PROBE_ORIGIN);

    if (url.origin !== PROBE_ORIGIN) return DEFAULT_REDIRECT;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
};
