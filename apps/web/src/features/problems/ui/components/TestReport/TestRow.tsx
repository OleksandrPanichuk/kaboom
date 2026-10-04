import type { TestResultModel } from "@repo/api-client";
import { HOLDS_LABEL, type LoadScenarioInput } from "@repo/design";
import { cn } from "cn";
import { ChevronRight, EyeOff, Play } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { ReplayRequest } from "@/features/designs";
import { useWorkspacePanels } from "@/features/shell";

import { AssertionItem } from "./AssertionItem";
import { StatusIcon } from "./StatusIcon";
import {
  formatDuration,
  replayScenario,
  type TestChange,
} from "./TestReport.helpers";

interface TestRowProps {
  test: TestResultModel;
  change: TestChange | null;
  labelOf: (nodeId: string) => string;
  onReplay?: (request: ReplayRequest) => void;
}

export function TestRow({ test, change, labelOf, onReplay }: TestRowProps) {
  const id = useId();
  const { closePanels } = useWorkspacePanels();
  const hidden = test.visibility === "hidden";
  const [open, setOpen] = useState(test.status === "failed" && !hidden);
  const scenario: LoadScenarioInput | null =
    hidden || !onReplay ? null : replayScenario(test.replay);
  const replay = (at: number | null, nodeIds: string[], seed?: number) =>
    scenario
      ? () => {
          onReplay?.({
            title: seed ? `${test.title}, run ${seed}` : test.title,
            scenario,
            at,
            nodeIds,
            seed,
          });
          closePanels();
        }
      : null;
  const worstSeed = test.variation?.worstSeed ?? null;
  const expandable =
    !hidden && (test.assertions.length > 0 || test.description !== "");

  const heading = (
    <>
      <ChevronRight
        aria-hidden="true"
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground transition-transform",
          open && "rotate-90",
          !expandable && "invisible",
        )}
      />
      <StatusIcon status={test.status} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {test.title}
      </span>
      {hidden ? (
        <EyeOff
          aria-label="Hidden test"
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      ) : null}
      {change ? (
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
            change === "fixed"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700",
          )}
        >
          {change === "fixed" ? "Fixed" : "New failure"}
        </span>
      ) : null}
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatDuration(test.durationMs)}
      </span>
    </>
  );

  return (
    <li className="flex flex-col">
<<<<<<< HEAD
      {expandable ? (
        <button
          type="button"
          className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {heading}
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-2.5 px-2 py-2">
          {heading}
        </div>
      )}
=======
      <button
        type="button"
        className={cn(
          "flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          expandable ? "hover:bg-zinc-50" : "cursor-default",
        )}
        aria-expanded={expandable ? open : undefined}
        aria-controls={expandable ? id : undefined}
        onClick={() => expandable && setOpen((value) => !value)}
      >
        <ChevronRight
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
            !expandable && "invisible",
          )}
        />
        <StatusIcon status={test.status} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {test.title}
        </span>
        {hidden ? (
          <EyeOff
            aria-label="Hidden test"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        ) : null}
        {test.variation ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
              test.variation.passed === test.variation.total
                ? "bg-zinc-100 text-zinc-600"
                : "bg-amber-50 text-amber-800",
            )}
            title="Runs that passed with traffic, faults and capacity varied"
          >
            {test.variation.passed}/{test.variation.total}
          </span>
        ) : null}
        {change ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
              change === "fixed"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700",
            )}
          >
            {change === "fixed" ? "Fixed" : "New failure"}
          </span>
        ) : null}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatDuration(test.durationMs)}
        </span>
      </button>
>>>>>>> fc0f579 (feat: run every load test on varied traffic, faults and capacity)
      {expandable && open ? (
        <div
          id={id}
          className="flex flex-col gap-3 pt-1 pb-3 pr-2 pl-[3.25rem]"
        >
          {test.description ? (
            <p className="text-xs leading-5 text-muted-foreground text-pretty">
              {test.description}
            </p>
          ) : null}
          <ul className="flex flex-col gap-2.5">
            {test.assertions.map((assertion, index) => (
              <AssertionItem
                key={`${assertion.label}-${index}`}
                assertion={assertion}
                labelOf={labelOf}
                onShow={
                  assertion.passed
                    ? null
                    : assertion.label === HOLDS_LABEL && worstSeed !== null
                      ? replay(assertion.at, assertion.nodeIds, worstSeed)
                      : replay(assertion.at, assertion.nodeIds)
                }
              />
            ))}
          </ul>
          {scenario ? (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={replay(null, [])!}
            >
              <Play aria-hidden="true" />
              Replay on canvas
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
