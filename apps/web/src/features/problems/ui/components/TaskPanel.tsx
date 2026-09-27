import type { AttemptModel, ProblemModel } from "@repo/api-client";
import { EyeOff } from "lucide-react";

import { Markdown } from "@/components/Markdown";

import { DifficultyBadge } from "./DifficultyBadge";
import { HintList } from "./HintList";
import { PanelSection } from "./PanelSection";

interface TaskPanelProps {
  problem: ProblemModel;
  attempt: AttemptModel;
  revealing: boolean;
  hintError: string | null;
  onRevealHint: (index: number) => void;
}

export function TaskPanel({
  problem,
  attempt,
  revealing,
  hintError,
  onRevealHint,
}: TaskPanelProps) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 border-b px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={problem.difficulty} />
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="text-sm leading-5 text-muted-foreground text-pretty">
          {problem.summary}
        </p>
      </div>

      <PanelSection title="Brief">
        <Markdown>{problem.statement}</Markdown>
      </PanelSection>

      <PanelSection title="Drills">
        <ul className="flex flex-col gap-3">
          {problem.drills.map((drill) => (
            <li key={drill.id} className="flex flex-col gap-0.5">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {drill.visibility === "hidden" ? (
                  <EyeOff
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                ) : null}
                {drill.title}
              </p>
              <p className="text-sm leading-5 text-muted-foreground text-pretty">
                {drill.visibility === "hidden"
                  ? "Hidden. It runs only when you submit."
                  : drill.description}
              </p>
            </li>
          ))}
        </ul>
      </PanelSection>

      {problem.hints.length > 0 ? (
        <PanelSection title="Hints">
          <HintList
            hints={problem.hints}
            revealed={attempt.hints}
            pending={revealing}
            error={hintError}
            onReveal={onRevealHint}
          />
        </PanelSection>
      ) : null}

      <PanelSection title="How it is scored">
        <ul className="flex flex-col gap-2">
          {problem.rubric.map((item) => (
            <li
              key={item.key}
              className="flex min-w-0 items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0">{item.title}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {item.weight} pts
              </span>
            </li>
          ))}
        </ul>
      </PanelSection>
    </div>
  );
}
