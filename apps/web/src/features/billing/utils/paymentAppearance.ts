import type { Appearance } from "@stripe/stripe-js";

const token = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value === "" ? fallback : value;
};

export const paymentAppearance = (): Appearance => {
  const dark = document.documentElement.classList.contains("dark");

  return {
    theme: dark ? "night" : "stripe",
    variables: {
      fontFamily: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
      borderRadius: "10px",
      colorPrimary: token("--primary", dark ? "#f97316" : "#ea580c"),
      colorBackground: token("--card", dark ? "#0a0a0a" : "#ffffff"),
      colorText: token("--foreground", dark ? "#fafafa" : "#0a0a0a"),
      colorDanger: token("--destructive", "#dc2626"),
    },
  };
};
