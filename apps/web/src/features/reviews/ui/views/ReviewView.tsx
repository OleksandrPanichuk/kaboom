import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft, RotateCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import { interviewQuery } from "@/features/interview";
import { retryReviewMutation, reviewQuery } from "@/features/reviews/api";
import {
  ReviewFacts,
  ReviewNotice,
  ReviewReport,
} from "@/features/reviews/ui/components";
import { ShareButton } from "@/features/sharing";

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
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Link
          to="/interviews"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 self-start text-muted-foreground",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Interviews
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex max-w-3xl min-w-0 flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
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
          {interview.status === "reviewed" ? (
            <ShareButton subject="interview" subjectId={interviewId} />
          ) : null}
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            {interview.status === "reviewing" ||
            (interview.status === "reviewed" && review.isPending) ? (
              <ReviewNotice
                title="Writing your review"
                body="The reviewer reads the whole interview and runs every drill against your final design. It usually takes under a minute, and you will get an email when it is ready."
                busy
              />
            ) : interview.status === "review_failed" ? (
              <ReviewNotice
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
              </ReviewNotice>
            ) : interview.status === "active" ? (
              <ReviewNotice
                title="The interview is still running"
                body="The review is written once the interview ends."
              />
            ) : interview.status === "expired" ? (
              <ReviewNotice
                title="This interview expired"
                body="It sat idle for a day and ended without a review."
              />
            ) : review.data ? (
              <ReviewReport review={review.data} />
            ) : (
              <ReviewNotice
                title="The review could not be loaded"
                body={review.error ? errorMessage(review.error) : ""}
              />
            )}
          </div>
          <ReviewFacts
            interview={interview}
            onOpenInterview={() => onOpenInterview(interviewId)}
          />
        </div>
      </div>
    </div>
  );
}
