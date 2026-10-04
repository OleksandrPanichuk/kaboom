import type { TestResultModel } from "@repo/api-client";
import { cn } from "cn";
import { CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react";

import { STATUS_LABELS } from "./TestReport.constants";

interface StatusIconProps {
  status: TestResultModel["status"];
  className?: string;
}

const ICONS = {
  passed: { Icon: CircleCheck, tone: "text-emerald-600" },
  failed: { Icon: CircleX, tone: "text-red-600" },
  flaky: { Icon: CircleDashed, tone: "text-amber-600" },
  skipped: { Icon: CircleMinus, tone: "text-muted-foreground" },
} as const;

export function StatusIcon({ status, className }: StatusIconProps) {
  const { Icon, tone } = ICONS[status];

  return (
    <Icon
      aria-label={STATUS_LABELS[status]}
      className={cn("size-4 shrink-0", tone, className)}
    />
  );
}
