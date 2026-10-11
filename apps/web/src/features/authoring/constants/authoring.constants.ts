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
  { id: "interview", label: "Interview", keys: ["interview"] },
  { id: "chaos", label: "Chaos", keys: ["chaos"] },
] as const;

export type DraftSectionId = (typeof DRAFT_SECTIONS)[number]["id"];

export const DRAFT_STATUS_LABELS = {
  draft: "Draft",
  "in-review": "In review",
  "changes-requested": "Changes requested",
  published: "Published",
} as const;

export const DRAFT_STATUS_TONES = {
  draft: "border-border bg-muted/60 text-subtle-foreground",
  "in-review":
    "border-interactive-border bg-interactive-surface text-interactive-foreground",
  "changes-requested":
    "border-warning-border bg-warning-surface text-warning-foreground",
  published: "border-success-border bg-success-surface text-success-foreground",
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
