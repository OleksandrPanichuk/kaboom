import type { ProblemReviewModel } from "@repo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { errorMessage } from "@/features/auth";
import {
  approveReviewMutation,
  type Difficulty,
  rejectReviewMutation,
} from "@/features/moderation/api";

interface ReviewDecisionProps {
  review: ProblemReviewModel;
  onDecided: () => void;
}

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

const MIN_FEEDBACK = 10;

export function ReviewDecision({ review, onDecided }: ReviewDecisionProps) {
  const id = useId();
  const approve = useMutation(approveReviewMutation);
  const reject = useMutation(rejectReviewMutation);
  const [difficulty, setDifficulty] = useState<Difficulty>(review.difficulty);
  const [feedback, setFeedback] = useState("");
  const failure = approve.error ?? reject.error;
  const busy = approve.isPending || reject.isPending;

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <FieldLabel htmlFor={`${id}-difficulty`}>Publish as</FieldLabel>
        <Select
          value={difficulty}
          onValueChange={(next) => setDifficulty(next!)}
          items={[...DIFFICULTIES]}
        >
          <SelectTrigger id={`${id}-difficulty`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          The difficulty sets the points a solve is worth; the author asked for{" "}
          {review.difficulty}.
        </FieldDescription>
      </Field>
      <Button
        disabled={busy}
        onClick={() =>
          approve.mutate(
            {
              id: review.id,
              difficulty: difficulty === review.difficulty ? null : difficulty,
            },
            { onSuccess: onDecided },
          )
        }
      >
        {approve.isPending ? "Publishing…" : "Approve and publish"}
      </Button>
      <Field>
        <FieldLabel htmlFor={`${id}-feedback`}>Or send it back</FieldLabel>
        <Textarea
          id={`${id}-feedback`}
          value={feedback}
          rows={4}
          placeholder="What the author should change"
          onChange={(event) => setFeedback(event.target.value)}
        />
      </Field>
      <Button
        variant="outline"
        disabled={busy || feedback.trim().length < MIN_FEEDBACK}
        onClick={() =>
          reject.mutate(
            { id: review.id, feedback: feedback.trim() },
            { onSuccess: onDecided },
          )
        }
      >
        {reject.isPending ? "Sending…" : "Request changes"}
      </Button>
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(failure)}
        </p>
      ) : null}
    </div>
  );
}
