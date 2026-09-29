import type { SubmissionModel } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";

import { submissionsQuery } from "@/features/problems/api";

const POLL_MS = 3_000;

export const useLatestSubmission = (
  slug: string,
  submission: SubmissionModel,
): SubmissionModel => {
  const { data } = useQuery({
    ...submissionsQuery(slug),
    enabled: submission.reviewStatus === "pending",
    refetchInterval: (query) =>
      query.state.data?.items.find((item) => item.id === submission.id)
        ?.reviewStatus === "pending"
        ? POLL_MS
        : false,
  });

  return data?.items.find((item) => item.id === submission.id) ?? submission;
};
