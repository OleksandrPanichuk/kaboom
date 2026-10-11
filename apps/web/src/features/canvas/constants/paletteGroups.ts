import {
  type NodeKind,
  type Track,
  TRACK_DEFINITIONS,
  TRACKS,
} from "@repo/design";

export interface PaletteGroup {
  track: Track;
  label: string;
  kinds: readonly NodeKind[];
}

export const PALETTE_GROUPS: PaletteGroup[] = TRACKS.flatMap((track) =>
  TRACK_DEFINITIONS[track].palette.map((section) => ({ track, ...section })),
);
