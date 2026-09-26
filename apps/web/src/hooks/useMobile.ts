import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

const subscribe = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(MOBILE_QUERY);

  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
};

const isMobileNow = (): boolean => window.matchMedia(MOBILE_QUERY).matches;

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobileNow, () => false);
}
