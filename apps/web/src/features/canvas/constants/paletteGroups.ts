import { type NodeKind, type Track, TRACKS } from "@repo/design";
import { TRACK_DEFINITIONS } from "@repo/scoring";

export interface PaletteGroup {
  track: Track;
  label: string;
  kinds: readonly NodeKind[];
}

export const PALETTE_GROUPS: PaletteGroup[] = TRACKS.flatMap((track) =>
  TRACK_DEFINITIONS[track].palette.map((section) => ({ track, ...section })),
);
