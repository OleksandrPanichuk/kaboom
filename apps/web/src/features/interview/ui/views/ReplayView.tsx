import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/Button";
import {
  type CanvasFocus,
  CanvasProvider,
  DesignCanvas,
} from "@/features/canvas";
import { interviewReplayQuery } from "@/features/interview/api";
import { REPLAY_SPEEDS, useReplayPlayback } from "@/features/interview/hooks";
import {
  ReplayScrubber,
  ReplayTranscript,
} from "@/features/interview/ui/components";
import {
  buildTimeline,
  entriesAt,
  formatDuration,
  graphAt,
  highlightAt,
  nextStop,
  phaseAt,
  phaseLabel,
  previousStop,
} from "@/features/interview/utils";

interface ReplayViewProps {
  interviewId: string;
}

const NOTHING = () => undefined;
const NO_ERROR = () => null;

export function ReplayView({ interviewId }: ReplayViewProps) {
  const { data: replay } = useSuspenseQuery(interviewReplayQuery(interviewId));
  const timeline = useMemo(() => buildTimeline(replay), [replay]);
  const { offset, setOffset, playing, setPlaying, speed, setSpeed } =
    useReplayPlayback(timeline.stops);
  const revision = graphAt(timeline.revisions, offset);
  const shown = entriesAt(timeline.entries, offset);
  const phase = phaseAt(
    timeline.entries,
    offset,
    replay.problem.phases[0]?.id ?? "requirements",
  );
  const highlight = highlightAt(timeline.entries, offset);
  const wanted: CanvasFocus | null = highlight
    ? { nodeIds: highlight.nodeIds, token: highlight.offset, select: false }
    : revision
      ? {
          nodeIds: revision.graph.nodes.map((node) => node.id),
          token: -1 - revision.number,
          select: false,
        }
      : null;
  const [focus, setFocus] = useState<CanvasFocus | null>(wanted);

  if ((focus?.token ?? null) !== (wanted?.token ?? null)) setFocus(wanted);
  const atEnd = nextStop(timeline.stops, offset) === null;

  return (
    <div className="flex flex-1 flex-col gap-3 bg-background px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to="/interviews/$interviewId/review"
          params={{ interviewId }}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 text-muted-foreground",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Review
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-lg font-semibold tracking-[-0.02em]">
            Replay · {replay.problem.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {phaseLabel(phase)}
            {revision ? ` · revision ${revision.number}` : ""}
          </p>
        </div>
      </header>
      <div className="grid gap-3 lg:h-[min(70dvh,46rem)] lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section
          aria-label="The design at this moment"
          className="relative h-[22rem] overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:h-full"
        >
          {revision ? (
            <CanvasProvider>
              <DesignCanvas
                graph={revision.graph}
                layout={replay.layout}
                hits={[]}
                overlay={null}
                focus={focus}
                readOnly
                onAddNode={NOTHING}
                onMoveNodes={NOTHING}
                connectionError={NO_ERROR}
                onConnect={NOTHING}
                onRefuseConnection={NOTHING}
                onDelete={NOTHING}
                onSelectionChange={NOTHING}
              />
            </CanvasProvider>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              The design has no revisions to show.
            </p>
          )}
        </section>
        <section
          aria-label="Conversation"
          className="flex h-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:h-full"
        >
          <ReplayTranscript entries={shown} />
        </section>
      </div>
      <footer className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-card backdrop-blur">
        <ReplayScrubber
          offset={offset}
          duration={timeline.duration}
          entries={timeline.entries}
          revisions={timeline.revisions}
          onSeek={(to) => {
            setPlaying(false);
            setOffset(to);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous moment"
            onClick={() => setOffset(previousStop(timeline.stops, offset))}
          >
            <SkipBack aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (atEnd) setOffset(0);
              setPlaying(!playing);
            }}
          >
            {playing ? (
              <Pause aria-hidden="true" data-icon="inline-start" />
            ) : (
              <Play aria-hidden="true" data-icon="inline-start" />
            )}
            {playing ? "Pause" : atEnd ? "Play again" : "Play"}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next moment"
            disabled={atEnd}
            onClick={() => {
              const next = nextStop(timeline.stops, offset);

              if (next !== null) setOffset(next);
            }}
          >
            <SkipForward aria-hidden="true" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatDuration(offset)} / {formatDuration(timeline.duration)}
          </span>
          <div
            role="radiogroup"
            aria-label="Speed"
            className="ml-auto flex gap-0.5 rounded-lg bg-muted p-0.5"
          >
            {REPLAY_SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={speed === value}
                onClick={() => setSpeed(value)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium tabular-nums",
                  speed === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {value}×
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
