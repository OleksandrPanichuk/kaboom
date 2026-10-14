import { useSuspenseQuery } from "@tanstack/react-query";

import { SegmentedControl } from "@/components/SegmentedControl";
import { reviewsQuery, type ReviewStatus } from "@/features/moderation/api";
import { ReviewsTable } from "@/features/moderation/ui/components";

interface ReviewsQueueViewProps {
  status: ReviewStatus;
  onStatusChange: (status: ReviewStatus) => void;
}

const OPTIONS: Array<{ value: ReviewStatus; label: string }> = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Sent back" },
];

const COUNTS: Record<ReviewStatus, [string, string]> = {
  pending: ["problem waiting", "problems waiting"],
  approved: ["approved", "approved"],
  rejected: ["sent back", "sent back"],
  withdrawn: ["withdrawn", "withdrawn"],
};

export function ReviewsQueueView({
  status,
  onStatusChange,
}: ReviewsQueueViewProps) {
  const { data } = useSuspenseQuery(reviewsQuery(status));
  const count = data.items.length;

  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Reviews</h1>
          <p className="text-sm leading-6 text-muted-foreground text-pretty sm:text-base">
            Community problems waiting to be published, oldest first. You cannot
            review your own.
          </p>
        </div>
        <SegmentedControl
          name="status"
          label="Review status"
          value={status}
          options={OPTIONS}
          onChange={(next) =>
            onStatusChange(
              OPTIONS.find((option) => option.value === next)!.value,
            )
          }
        />
        <p role="status" className="-mb-3 text-sm text-muted-foreground">
          {count} {COUNTS[status][count === 1 ? 0 : 1]}
        </p>
        <ReviewsTable reviews={data.items} />
      </div>
    </div>
  );
}
