import { useMutation } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import { startInterviewMutation } from "@/features/interview/api";
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
  const running =
    start.error instanceof ApiRequestError &&
    start.error.code === "INTERVIEW_ALREADY_ACTIVE"
      ? String(start.error.details?.interviewId ?? "")
      : null;

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
            className="font-medium text-indigo-700 underline-offset-2 hover:underline"
            onClick={() => onOpen(running)}
          >
            Go back to it
          </button>
        </p>
      ) : start.error ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(start.error)}
        </p>
      ) : null}
    </div>
  );
}
