import type { Track } from "@repo/design";

export const DIFFICULTY_LABELS = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
} as const;

export const DIFFICULTY_TONES = {
  easy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  hard: "border-red-200 bg-red-50 text-red-800",
} as const;

export const TRACK_LABELS = {
  "system-design": "System design",
  devops: "DevOps",
} as const satisfies Record<Track, string>;
