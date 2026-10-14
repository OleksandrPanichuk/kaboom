import { useSuspenseQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/Empty";
import { interviewsQuery } from "@/features/interview/api";
import {
  InterviewRow,
  StartInterviewButton,
} from "@/features/interview/ui/components";

interface InterviewsViewProps {
  onOpen: (interviewId: string) => void;
}

export function InterviewsView({ onOpen }: InterviewsViewProps) {
  const { data } = useSuspenseQuery(interviewsQuery);
  const start = (
    <StartInterviewButton
      slug="url-shortener"
      label="Start: URL shortener"
      variant="default"
      onOpen={onOpen}
    />
  );

  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">
              Interviews
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base text-pretty">
              Design a system while an interviewer asks questions and breaks it
              with drills.
            </p>
          </div>
          {data.items.length > 0 ? start : null}
        </div>
        {data.items.length === 0 ? (
          <Empty className="rounded-2xl border border-dashed border-border bg-card/60 py-14">
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="size-11 rounded-2xl border border-interactive-border/60 bg-interactive-surface text-interactive-foreground"
              >
                <MessagesSquare aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No interviews yet</EmptyTitle>
              <EmptyDescription>
                An interview takes about forty minutes: requirements, a design,
                a deep dive with drills, and a wrap-up.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>{start}</EmptyContent>
          </Empty>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {data.items.map((interview) => (
              <InterviewRow key={interview.id} interview={interview} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
