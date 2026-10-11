export const DRAFT_SECTIONS = [
  {
    id: "details",
    label: "Details",
    keys: ["slug", "title", "track", "difficulty", "tags", "summary"],
  },
  { id: "statement", label: "Statement", keys: ["statement"] },
  { id: "baseline", label: "Baseline", keys: ["baseline"] },
  { id: "reference", label: "Reference", keys: ["reference"] },
  { id: "drills", label: "Drills", keys: ["drills"] },
  { id: "rubric", label: "Rubric", keys: ["rubric"] },
  { id: "hints", label: "Hints", keys: ["hints"] },
  {
    id: "advanced",
    label: "Interview and chaos",
    keys: ["interview", "chaos"],
  },
] as const;

export type DraftSectionId = (typeof DRAFT_SECTIONS)[number]["id"];

export const DRAFT_STATUS_LABELS = {
  draft: "Draft",
  "in-review": "In review",
  "changes-requested": "Changes requested",
  published: "Published",
} as const;

export const DRAFT_STATUS_TONES = {
  draft: "border-zinc-200 bg-zinc-50 text-zinc-700",
  "in-review": "border-indigo-200 bg-indigo-50 text-indigo-700",
  "changes-requested": "border-amber-200 bg-amber-50 text-amber-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const;

export const TRACK_OPTIONS = [
  { value: "system-design", label: "System design" },
  { value: "devops", label: "DevOps" },
  { value: "data-model", label: "Data model" },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

export const AUTOSAVE_DELAY_MS = 800;
