import type { SolutionsModel } from "@repo/api-client";
import { cn } from "cn";
import { CircleCheck, Eye, TriangleAlert, Users } from "lucide-react";
import { useEffect, useState } from "react";

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
import {
  formatLockedUntil,
  formatSubmittedAt,
  scoreTone,
} from "@/features/problems/utils";

import { PanelSection } from "./PanelSection";
import { SolutionPreview } from "./SolutionPreview";

interface SolutionsPanelProps {
  lockedUntil: string | null;
  solved: boolean;
  shown: SolutionsModel | null;
  pending: boolean;
  error: string | null;
  onReveal: () => void;
}

export function SolutionsPanel({
  lockedUntil,
  solved,
  shown,
  pending,
  error,
  onReveal,
}: SolutionsPanelProps) {
  const [asking, setAsking] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const opened = viewing !== null ? shown?.solutions[viewing] : undefined;
  const until = shown ? shown.lockedUntil : lockedUntil;
  const Icon = solved ? CircleCheck : TriangleAlert;

  useEffect(() => {
    if (solved && !shown && !pending && !error) onReveal();
  }, [solved, shown, pending, error, onReveal]);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex gap-2.5 border-b px-4 py-3 text-sm leading-5",
          solved
            ? "bg-success-surface text-success-foreground"
            : until
              ? "bg-warning-surface text-warning-foreground"
              : "text-muted-foreground",
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            solved
              ? "text-success"
              : until
                ? "text-warning"
                : "text-muted-foreground",
          )}
        />
        <p className="text-pretty">
          {solved ? (
            <>
              You passed every test, so other solutions are open and looking
              costs nothing.
              {until ? (
                <>
                  {" "}
                  From your earlier look, submissions here count again{" "}
                  <span className="font-medium">
                    {formatLockedUntil(until)}
                  </span>
                  .
                </>
              ) : null}
            </>
          ) : until ? (
            <>
              You have looked at other solutions. Your submissions here are
              still scored but do not count toward points until{" "}
              <span className="font-medium">{formatLockedUntil(until)}</span>.
              Points you earned before stay.
            </>
          ) : (
            "Pass every test to open other solutions for free. Looking before that spoils the problem: for seven days after, your submissions here are scored but do not count toward points. Points you have already earned stay."
          )}
        </p>
      </div>

      {shown ? (
        <PanelSection
          title={`${shown.solutions.length} ${shown.solutions.length === 1 ? "solution" : "solutions"} scoring 80 or more`}
        >
          {shown.solutions.length === 0 ? (
            <p className="text-sm leading-5 text-muted-foreground">
              Nobody else has solved it that well yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shown.solutions.map((solution, index) => (
                <li
                  key={`${solution.submittedAt}-${index}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <p className="text-sm font-medium">
                      <span
                        className={cn(
                          "tabular-nums",
                          scoreTone(solution.score),
                        )}
                      >
                        {solution.score}
                      </span>{" "}
                      / 100
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Submitted {formatSubmittedAt(solution.submittedAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setViewing(index)}
                  >
                    <Eye aria-hidden="true" />
                    View
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </PanelSection>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <span className="grid size-9 place-items-center rounded-xl bg-muted text-subtle-foreground">
            <Users aria-hidden="true" className="size-4" />
          </span>
          <p className="text-sm leading-5 text-muted-foreground text-pretty">
            See how others solved it: the best design of each solver who scored
            80 or more, without their names.
          </p>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => (solved ? onReveal() : setAsking(true))}
          >
            {pending
              ? "Loading…"
              : until
                ? "Show solutions again"
                : "Show solutions"}
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Look at other solutions?</AlertDialogTitle>
            <AlertDialogDescription>
              For seven days from now, your submissions to this problem are
              scored but do not count toward your points or rank. Points you
              have already earned stay.
              {until ? " Looking again starts the seven days over." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep trying</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReveal();
                setAsking(false);
              }}
            >
              Show solutions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {opened ? (
        <SolutionPreview
          title={`A solution scoring ${opened.score}`}
          description={`Submitted ${formatSubmittedAt(opened.submittedAt)}. You can pan and zoom, but not change it.`}
          graph={opened.graph}
          open
          onOpenChange={(open) => {
            if (!open) setViewing(null);
          }}
        />
      ) : null}
    </div>
  );
}
