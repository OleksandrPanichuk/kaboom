import { cn } from "cn";
import { Bot, MousePointerClick, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  INTERVIEW_STAGES,
  type InterviewStage,
} from "@/features/marketing/constants";

import { SectionHeading } from "./SectionHeading";

function StageVisual({
  stage,
  index,
}: {
  stage: InterviewStage;
  index: number;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/70 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-border/80 px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="size-2 rounded-full bg-success-foreground motion-safe:animate-blink" />
          Mock interview · Ticket sales
        </span>
        <span className="flex gap-1">
          {INTERVIEW_STAGES.map((other, otherIndex) => (
            <span
              key={other.phase}
              className={cn(
                "h-1.5 w-6 rounded-full transition-colors duration-500",
                otherIndex <= index ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </span>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {stage.phase}
        </span>
        <div className="flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-subtle-foreground">
            <Bot aria-hidden="true" className="size-4" />
          </span>
          <p className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-6">
            {stage.interviewer}
          </p>
        </div>
        <div className="flex flex-row-reverse gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <UserRound aria-hidden="true" className="size-4" />
          </span>
          <p className="rounded-2xl rounded-tr-sm bg-primary/90 px-4 py-2.5 text-sm leading-6 text-primary-foreground">
            {stage.candidate}
          </p>
        </div>
        <p className="flex items-center gap-2 self-start rounded-lg border border-dashed border-border px-3 py-1.5 font-mono text-xs text-muted-foreground">
          <MousePointerClick
            aria-hidden="true"
            className="size-3.5 text-primary"
          />
          {stage.tool}
        </p>
      </div>
    </div>
  );
}

export function InterviewStory() {
  const [active, setActive] = useState(0);
  const steps = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => Number((entry.target as HTMLElement).dataset.stage));

        if (visible.length > 0) setActive(Math.max(...visible));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    steps.current.forEach((step) => step && observer.observe(step));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="interview"
      className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-12 px-4 py-20 sm:px-6 sm:py-28"
    >
      <SectionHeading
        eyebrow="Inside a mock interview"
        title="Forty-five minutes with an interviewer who never gets tired"
        body="Four phases, like the real thing. The interviewer sees your canvas live, asks follow-ups, tests your claims and writes the review."
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <ol className="flex flex-col">
          {INTERVIEW_STAGES.map((stage, index) => (
            <li
              key={stage.phase}
              ref={(element) => {
                steps.current[index] = element;
              }}
              data-stage={index}
              className="flex flex-col gap-4 py-8 lg:min-h-[60vh] lg:justify-center"
            >
              <span
                className={cn(
                  "font-mono text-sm transition-colors duration-500",
                  index === active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {String(index + 1).padStart(2, "0")} · {stage.phase}
              </span>
              <h3
                className={cn(
                  "text-2xl font-semibold tracking-[-0.03em] transition-opacity duration-500 sm:text-3xl",
                  index === active ? "opacity-100" : "lg:opacity-40",
                )}
              >
                {stage.title}
              </h3>
              <p
                className={cn(
                  "max-w-md text-base leading-7 text-muted-foreground transition-opacity duration-500",
                  index === active ? "opacity-100" : "lg:opacity-40",
                )}
              >
                {stage.body}
              </p>
              <div className="lg:hidden">
                <StageVisual stage={stage} index={index} />
              </div>
            </li>
          ))}
        </ol>
        <div className="hidden lg:block">
          <div className="sticky top-[calc(50vh-11rem)]">
            <div
              key={active}
              className="motion-safe:animate-[kb-stage_0.6s_ease-out]"
            >
              <StageVisual stage={INTERVIEW_STAGES[active]!} index={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
