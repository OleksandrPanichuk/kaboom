import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  LoaderCircle,
  MessagesSquare,
  RotateCw,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import { interviewQuery } from "@/features/interview";
import { retryReviewMutation, reviewQuery } from "@/features/reviews/api";
import { ReviewReport } from "@/features/reviews/ui/components";

interface ReviewViewProps {
  interviewId: string;
  onOpenInterview: (interviewId: string) => void;
}

const POLL_MS = 3_000;

export function ReviewView({ interviewId, onOpenInterview }: ReviewViewProps) {
  const { data: interview } = useSuspenseQuery({
    ...interviewQuery(interviewId),
    refetchInterval: (query) =>
      query.state.data?.status === "reviewing" ? POLL_MS : false,
  });
  const review = useQuery({
    ...reviewQuery(interviewId),
    enabled: interview.status === "reviewed",
  });
  const retry = useMutation(retryReviewMutation);
  const endedAt = interview.endedAt ?? interview.startedAt;

  return (
    <div className="flex-1 bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Link
          to="/interviews"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Interviews
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance">
              {interview.problem.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Interview review ·{" "}
              {new Date(endedAt).toLocaleDateString("en", {
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenInterview(interviewId)}
          >
            <MessagesSquare aria-hidden="true" />
            Open the interview
          </Button>
        </div>

        {interview.status === "reviewing" ||
        (interview.status === "reviewed" && review.isPending) ? (
          <Notice
            title="Writing your review"
            body="The reviewer reads the whole interview and runs every drill against your final design. It usually takes under a minute, and you will get an email when it is ready."
            busy
          />
        ) : interview.status === "review_failed" ? (
          <Notice
            title="The review could not be written"
            body="Something went wrong while writing it. Your interview is saved, so trying again starts from the same record."
          >
            <Button
              className="self-start"
              disabled={retry.isPending}
              onClick={() => retry.mutate({ interviewId })}
            >
              <RotateCw aria-hidden="true" />
              {retry.isPending ? "Retrying…" : "Try again"}
            </Button>
            {retry.error ? (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(retry.error)}
              </p>
            ) : null}
          </Notice>
        ) : interview.status === "active" ? (
          <Notice
            title="The interview is still running"
            body="The review is written once the interview ends."
          />
        ) : interview.status === "expired" ? (
          <Notice
            title="This interview expired"
            body="It sat idle for a day and ended without a review."
          />
        ) : review.data ? (
          <ReviewReport review={review.data} />
        ) : (
          <Notice
            title="The review could not be loaded"
            body={review.error ? errorMessage(review.error) : ""}
          />
        )}
      </div>
    </div>
  );
}

interface NoticeProps {
  title: string;
  body: string;
  busy?: boolean;
  children?: React.ReactNode;
}

function Notice({ title, body, busy = false, children }: NoticeProps) {
  return (
    <section
      role={busy ? "status" : undefined}
      className="flex flex-col gap-3 rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-6"
    >
      <h2 className="flex items-center gap-2 font-semibold">
        {busy ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin text-indigo-600"
          />
        ) : null}
        {title}
      </h2>
      {body ? (
        <p className="text-sm leading-6 text-muted-foreground text-pretty">
          {body}
        </p>
      ) : null}
      {children}
    </section>
  );
}
