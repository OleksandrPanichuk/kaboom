import { t } from "elysia";

import { PageQueryFields } from "@/core/pagination";
import { PROBLEM_REVIEW_STATUSES } from "@/db";

export const ListReviewsQuery = t.Object({
  ...PageQueryFields,
  status: t.Optional(
    t.Union(PROBLEM_REVIEW_STATUSES.map((value) => t.Literal(value))),
  ),
});
export type ListReviewsQuery = typeof ListReviewsQuery.static;
