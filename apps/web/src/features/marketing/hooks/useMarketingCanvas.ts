import { useEffect } from "react";

const MARKETING_BACKGROUND = "#0e1116";

export const useMarketingCanvas = () => {
  useEffect(() => {
    const root = document.documentElement;

    root.style.backgroundColor = MARKETING_BACKGROUND;

    return () => {
      root.style.backgroundColor = "";
    };
  }, []);
};
