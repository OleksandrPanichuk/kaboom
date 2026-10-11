import { cn } from "cn";

import {
  DRAFT_STATUS_LABELS,
  DRAFT_STATUS_TONES,
} from "@/features/authoring/constants";

interface DraftStatusBadgeProps {
  status: keyof typeof DRAFT_STATUS_LABELS;
}

export function DraftStatusBadge({ status }: DraftStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        DRAFT_STATUS_TONES[status],
      )}
    >
      {DRAFT_STATUS_LABELS[status]}
    </span>
  );
}
