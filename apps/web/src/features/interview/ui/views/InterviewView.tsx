import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ClipboardCheck, MessagesSquare } from "lucide-react";
import { useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import {
  DesignWorkspace,
  type DesignWorkspaceContext,
} from "@/features/designs";
import {
  interruptInterviewer,
  interviewQuery,
  interviewTransport,
  sendInterviewMessageMutation,
  submitInterviewMutation,
} from "@/features/interview/api";
import { useInterviewEvents } from "@/features/interview/hooks";
import type { DurableEvent } from "@/features/interview/typedefs";
import {
  EndInterviewButton,
  InterviewBridge,
  InterviewChat,
  PhaseClock,
} from "@/features/interview/ui/components";

interface InterviewViewProps {
  interviewId: string;
}

export function InterviewView({ interviewId }: InterviewViewProps) {
  const { data: interview } = useSuspenseQuery(interviewQuery(interviewId));
  const [transport] = useState(() => interviewTransport(interviewId));
  const send = useMutation(sendInterviewMessageMutation);
  const submit = useMutation(submitInterviewMutation);
  const contextRef = useRef<DesignWorkspaceContext | null>(null);
  const ownRevisions = useRef(new Set<number>());
  const active = interview.status === "active";

  const onLive = (event: DurableEvent) => {
    const context = contextRef.current;

    if (event.type === "highlight") {
      context?.focusNodes(
        (event.payload.nodeIds as string[] | undefined) ?? [],
      );
    }

    if (event.type === "revision" && event.payload.author === "interviewer") {
      ownRevisions.current.add(Number(event.payload.revision));
      void context?.resync();
    }
  };

  const { events, live, thinking } = useInterviewEvents(interviewId, {
    onLive,
  });
  const error = send.error
    ? errorMessage(send.error)
    : submit.error
      ? errorMessage(submit.error)
      : null;

  return (
    <DesignWorkspace
      key={interview.designId}
      designId={interview.designId}
      back={{ to: "/interviews", label: "Interviews" }}
      title={interview.problem.title}
      simulation={false}
      initialTab="interview"
      transport={transport}
      readOnly={!active}
      leadingTabs={() => [
        {
          id: "interview",
          label: "Interview",
          icon: MessagesSquare,
          content: (
            <InterviewChat
              interview={interview}
              events={events}
              live={live}
              thinking={thinking}
              sending={send.isPending}
              error={error}
              onSend={(body) => send.mutate({ id: interviewId, body })}
              onStop={() => void interruptInterviewer(interviewId)}
            />
          ),
        },
      ]}
      actions={(context) => (
        <>
          <InterviewBridge
            interviewId={interviewId}
            active={active}
            context={context}
            contextRef={contextRef}
            ownRevisions={ownRevisions}
          />
          <PhaseClock interview={interview} />
          {active ? (
            <EndInterviewButton
              disabled={submit.isPending}
              onEnd={() => submit.mutate({ id: interviewId })}
            />
          ) : interview.status !== "expired" ? (
            <Link
              to="/interviews/$interviewId/review"
              params={{ interviewId }}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <ClipboardCheck aria-hidden="true" />
              Review
            </Link>
          ) : null}
        </>
      )}
    />
  );
}
