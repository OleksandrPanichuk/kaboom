import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { ProblemEntity } from "../problem.entity";
import { ProblemModel } from "../problem.model";
import type { ProblemsActions } from "../problems.routes";

export const ProblemParams = t.Object({
  slug: t.String({ minLength: 3, maxLength: 64 }),
});

export const ProblemQuery = t.Object({
  version: t.Optional(
    t.Integer({
      minimum: 1,
      description:
        "An earlier version to answer instead of the current one, such as the version an attempt is pinned to",
    }),
  ),
});

export const getProblemRoute = ({ getProblem }: ProblemsActions) =>
  defineRoute({
    params: ProblemParams,
    query: ProblemQuery,
    response: ProblemModel,
    summary: "Get a published problem, without what solvers must not see",
    description:
      "Answers the current version's statement, baseline, public drills and rubric weights, or those of the version asked for. Hidden drills show only their titles, and the reference solution never leaves the server.",
    auth: true,

    action: ({ params, query }) =>
      getProblem.execute({ slug: params.slug, version: query.version }),
    postAction: ({ output }) => ProblemEntity.normalize(output),
  });
