import { useSyncExternalStore } from "react";

import { useThemeStore } from "@/features/shell/store";

const QUERY = "(prefers-color-scheme: dark)";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(QUERY);

  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
};

const systemPrefersDark = () => window.matchMedia(QUERY).matches;

export const useResolvedTheme = (): "light" | "dark" => {
  const theme = useThemeStore((state) => state.theme);
  const dark = useSyncExternalStore(subscribe, systemPrefersDark, () => false);

  if (theme === "system") return dark ? "dark" : "light";

  return theme;
};
