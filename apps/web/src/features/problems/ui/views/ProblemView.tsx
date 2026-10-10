import type { TestReportModel } from "@repo/api-client";
import type { DesignGraph } from "@repo/design";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import {
  FileText,
  FlaskConical,
  History,
  Play,
  Send,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import { DesignWorkspace } from "@/features/designs";
import {
  attemptQuery,
  problemQuery,
  revealHintMutation,
  revealSolutionsMutation,
  runProblemMutation,
  startProblemMutation,
  submitSolutionMutation,
  upgradeAttemptMutation,
} from "@/features/problems/api";
import type { ProblemOutcome } from "@/features/problems/typedefs";
import {
  HistoryPanel,
  ProblemStart,
  SolutionsPanel,
  TaskPanel,
  TestsPanel,
} from "@/features/problems/ui/components";
import { pinnedVersion } from "@/features/problems/utils";

interface ProblemViewProps {
  slug: string;
  onOpenInterview: (interviewId: string) => void;
}

const labelOf = (graph: DesignGraph, nodeId: string) => {
  const label = graph.nodes.find((node) => node.id === nodeId)?.label;

  return label === undefined || label === "" ? nodeId : label;
};

export function ProblemView({ slug, onOpenInterview }: ProblemViewProps) {
  const { data: attempt } = useSuspenseQuery(attemptQuery(slug));
  const { data: problem } = useSuspenseQuery(
    problemQuery(slug, pinnedVersion(attempt)),
  );
  const start = useMutation(startProblemMutation);
  const run = useMutation(runProblemMutation);
  const submit = useMutation(submitSolutionMutation);
  const hint = useMutation(revealHintMutation);
  const solutions = useMutation(revealSolutionsMutation);
  const upgrade = useMutation(upgradeAttemptMutation);
  const [outcome, setOutcome] = useState<ProblemOutcome | null>(null);
  const [previous, setPrevious] = useState<TestReportModel | null>(null);
  const [runs, setRuns] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!attempt) {
    return (
      <ProblemStart
        problem={problem}
        pending={start.isPending}
        error={start.error ? errorMessage(start.error) : null}
        onStart={() => start.mutate({ slug })}
        onOpenInterview={onOpenInterview}
      />
    );
  }

  const busy = run.isPending || submit.isPending;

  return (
    <DesignWorkspace
      key={attempt.designId}
      designId={attempt.designId}
      back={{ to: "/problems", label: "Problems" }}
      title={problem.title}
      track={problem.track}
      simulation={false}
      initialTab="task"
      leadingTabs={({ revision, graph, replay }) => [
        {
          id: "task",
          label: "Task",
          icon: FileText,
          content: (
            <TaskPanel
              problem={problem}
              attempt={attempt}
              upgrading={upgrade.isPending}
              upgradeError={upgrade.error ? errorMessage(upgrade.error) : null}
              onUpgrade={() =>
                upgrade.mutate(
                  { slug },
                  {
                    onSuccess: () => {
                      setOutcome(null);
                      setPrevious(null);
                    },
                  },
                )
              }
              revealing={hint.isPending}
              hintError={hint.error ? errorMessage(hint.error) : null}
              onRevealHint={(index) => hint.mutate({ slug, index })}
            />
          ),
        },
        {
          id: "tests",
          label: "Tests",
          icon: FlaskConical,
          content: (
            <TestsPanel
              slug={slug}
              outcome={outcome}
              previous={previous}
              runKey={runs}
              revision={revision}
              error={error}
              labelOf={(nodeId) => labelOf(graph, nodeId)}
              onReplay={replay}
            />
          ),
        },
        {
          id: "history",
          label: "History",
          icon: History,
          content: <HistoryPanel slug={slug} />,
        },
        {
          id: "solutions",
          label: "Solutions",
          icon: Users,
          content: (
            <SolutionsPanel
              lockedUntil={attempt.lockedUntil}
              shown={solutions.data ?? null}
              pending={solutions.isPending}
              error={solutions.error ? errorMessage(solutions.error) : null}
              onReveal={() => solutions.mutate({ slug })}
            />
          ),
        },
      ]}
      actions={({ revision, saving, showTab }) => (
        <>
          <Button
            variant="outline"
            size="sm"
            aria-label="Run tests"
            disabled={saving || busy}
            onClick={() => {
              setError(null);
              showTab("tests");
              run.mutate(
                { slug },
                {
                  onSuccess: (result) => {
                    setPrevious(
                      outcome?.kind === "run" ? outcome.run.report : null,
                    );
                    setOutcome({ kind: "run", run: result });
                    setRuns((count) => count + 1);
                  },
                  onError: (failure) => setError(errorMessage(failure)),
                },
              );
            }}
          >
            <Play aria-hidden="true" />
            <span className="hidden sm:inline">
              {run.isPending ? "Running…" : "Run tests"}
            </span>
          </Button>
          <Button
            size="sm"
            aria-label="Submit"
            disabled={saving || busy}
            onClick={() => {
              setError(null);
              showTab("tests");
              submit.mutate(
                { slug, revision },
                {
                  onSuccess: (submission) =>
                    setOutcome({ kind: "submission", submission }),
                  onError: (failure) => setError(errorMessage(failure)),
                },
              );
            }}
          >
            <Send aria-hidden="true" />
            <span className="hidden sm:inline">
              {submit.isPending ? "Submitting…" : "Submit"}
            </span>
          </Button>
        </>
      )}
    />
  );
}
