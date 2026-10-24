import { useMutation, useQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import { UpgradeNotice } from "@/features/billing";
import {
  interviewQuotaQuery,
  startInterviewMutation,
} from "@/features/interview/api";
import {
  allowanceLeft,
  describeAllowance,
  formatReset,
} from "@/features/interview/utils";
import { ApiRequestError } from "@/lib/api";

interface StartInterviewButtonProps {
  slug: string;
  label?: string;
  variant?: "default" | "outline";
  onOpen: (interviewId: string) => void;
}

export function StartInterviewButton({
  slug,
  label = "Practise it as an interview",
  variant = "outline",
  onOpen,
}: StartInterviewButtonProps) {
  const start = useMutation(startInterviewMutation);
  const { data: quota } = useQuery(interviewQuotaQuery);
  const running =
    start.error instanceof ApiRequestError &&
    start.error.code === "INTERVIEW_ALREADY_ACTIVE"
      ? String(start.error.details?.interviewId ?? "")
      : null;
  const refused =
    start.error instanceof ApiRequestError && start.error.code === "PLAN_LIMIT";
  const spent = quota !== undefined && allowanceLeft(quota) === 0;

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        size="lg"
        disabled={start.isPending}
        onClick={() =>
          start.mutate(
            { slug },
            { onSuccess: (interview) => onOpen(interview.id) },
          )
        }
      >
        <MessagesSquare aria-hidden="true" />
        {start.isPending ? "Starting…" : label}
      </Button>
      {running ? (
        <p className="text-sm text-muted-foreground">
          You already have an interview running.{" "}
          <button
            type="button"
            className="font-medium text-interactive-foreground underline-offset-2 hover:underline"
            onClick={() => onOpen(running)}
          >
            Go back to it
          </button>
        </p>
      ) : refused || spent ? (
        <UpgradeNotice
          title={quota ? describeAllowance(quota) : "Interview limit reached"}
          className="sm:flex-col sm:items-start"
        >
          {quota
            ? `It resets on ${formatReset(quota.resetsAt)}. Pro gives you three interviews a day.`
            : "Pro gives you three interviews a day."}
        </UpgradeNotice>
      ) : start.error ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(start.error)}
        </p>
      ) : quota ? (
        <p className="text-sm text-muted-foreground">
          {describeAllowance(quota)}
        </p>
      ) : null}
    </div>
  );
}
