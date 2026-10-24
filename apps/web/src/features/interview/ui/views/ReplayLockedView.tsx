import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { UpgradeNotice } from "@/features/billing";

interface ReplayLockedViewProps {
  interviewId: string;
}

export function ReplayLockedView({ interviewId }: ReplayLockedViewProps) {
  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link
          to="/interviews/$interviewId/review"
          params={{ interviewId }}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 self-start text-muted-foreground",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Back to the review
        </Link>
        <UpgradeNotice title="Replay is part of Pro">
          Watch the interview again with the conversation and your design side
          by side, and see where each decision was made. Your interview is
          saved, so it opens as soon as you upgrade.
        </UpgradeNotice>
      </div>
    </div>
  );
}
