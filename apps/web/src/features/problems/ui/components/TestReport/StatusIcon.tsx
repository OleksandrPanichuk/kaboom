import type { TestResultModel } from "@repo/api-client";
import { cn } from "cn";
import { CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react";

import { STATUS_LABELS } from "./TestReport.constants";

interface StatusIconProps {
  status: TestResultModel["status"];
  className?: string;
}

const ICONS = {
  passed: { Icon: CircleCheck, tone: "text-success" },
  failed: { Icon: CircleX, tone: "text-destructive" },
  flaky: { Icon: CircleDashed, tone: "text-warning" },
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
