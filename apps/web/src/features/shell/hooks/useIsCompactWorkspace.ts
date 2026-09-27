import { useSyncExternalStore } from "react";

const COMPACT_QUERY = "(max-width: 1023px)";

const subscribe = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(COMPACT_QUERY);

  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
};

const isCompactNow = (): boolean => window.matchMedia(COMPACT_QUERY).matches;

export const useIsCompactWorkspace = (): boolean =>
  useSyncExternalStore(subscribe, isCompactNow, () => false);
