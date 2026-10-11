import { useEffect } from "react";

import { useResolvedTheme } from "@/features/shell/hooks";

export function ThemeSync() {
  const theme = useResolvedTheme();

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  return null;
}
