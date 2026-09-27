import type { AttemptModel, ProblemModel } from "@repo/api-client";
import { Lightbulb, Lock } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";

interface HintListProps {
  hints: ProblemModel["hints"];
  revealed: AttemptModel["hints"];
  pending: boolean;
  error: string | null;
  onReveal: (index: number) => void;
}

export function HintList({
  hints,
  revealed,
  pending,
  error,
  onReveal,
}: HintListProps) {
  const [asking, setAsking] = useState<number | null>(null);
  const next = revealed.length;
  const pendingHint = hints.find((hint) => hint.index === asking);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-5 text-muted-foreground text-pretty">
        Stuck? A hint takes its points off every submission after you open it.
        Opening it again is free.
      </p>
      <ol className="flex flex-col gap-2">
        {hints.map((hint) => {
          const shown = revealed.find((item) => item.index === hint.index);

          return (
            <li
              key={hint.index}
              className="flex flex-col gap-2 rounded-xl border border-black/[0.07] bg-white p-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                  {shown ? (
                    <Lightbulb
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-amber-600"
                    />
                  ) : (
                    <Lock
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                  )}
                  <span className="min-w-0">{hint.title}</span>
                </p>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  −{hint.cost} pts
                </span>
              </div>
              {shown ? (
                <p className="text-sm leading-5 text-pretty">{shown.body}</p>
              ) : hint.index === next ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={pending}
                  onClick={() => setAsking(hint.index)}
                >
                  Show hint
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Opens after the hint before it.
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <AlertDialog
        open={pendingHint !== undefined}
        onOpenChange={(open) => {
          if (!open) setAsking(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Show this hint?</AlertDialogTitle>
            <AlertDialogDescription>
              Every submission from now on scores {pendingHint?.cost} points
              less. Submissions you have already made keep their score.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingHint) onReveal(pendingHint.index);
                setAsking(null);
              }}
            >
              Show it, −{pendingHint?.cost} pts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
