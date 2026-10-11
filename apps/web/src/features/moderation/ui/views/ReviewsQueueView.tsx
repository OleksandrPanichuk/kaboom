import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";

import { reviewsQuery, type ReviewStatus } from "@/features/moderation/api";
import { ReviewsTable } from "@/features/moderation/ui/components";

interface ReviewsQueueViewProps {
  status: ReviewStatus;
  onStatusChange: (status: ReviewStatus) => void;
}

const TABS: Array<{ value: ReviewStatus; label: string }> = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Sent back" },
];

export function ReviewsQueueView({
  status,
  onStatusChange,
}: ReviewsQueueViewProps) {
  const { data } = useSuspenseQuery(reviewsQuery(status));

  return (
    <div className="flex-1 bg-background px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Reviews</h1>
          <p className="text-sm leading-6 text-muted-foreground text-pretty sm:text-base">
            Community problems waiting to be published, oldest first. You cannot
            review your own.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Review status"
          className="flex w-fit gap-1 rounded-xl border border-border bg-card p-1"
        >
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground",
                status === tab.value && "bg-foreground text-background",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <ReviewsTable reviews={data.items} />
      </div>
    </div>
  );
}
