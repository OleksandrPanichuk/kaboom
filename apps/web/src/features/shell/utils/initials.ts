export const initials = (name: string): string => {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return letters === "" ? "?" : letters;
};
