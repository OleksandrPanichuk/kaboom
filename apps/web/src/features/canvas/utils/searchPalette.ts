import { catalogue } from "@repo/design";

import type { PaletteGroup } from "@/features/canvas/constants";

export const searchPalette = (
  groups: readonly PaletteGroup[],
  query: string,
): PaletteGroup[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length === 0) return [...groups];

  return groups.flatMap((group) => {
    const kinds = group.kinds.filter((kind) => {
      const { label, docs } = catalogue[kind];
      const text = `${label} ${kind} ${docs.summary}`.toLowerCase();

      return words.every((word) => text.includes(word));
    });

    return kinds.length > 0 ? [{ ...group, kinds }] : [];
  });
};
