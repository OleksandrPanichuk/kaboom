import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { ProblemEntity } from "../problem.entity";
import { ProblemModel } from "../problem.model";
import type { ProblemsActions } from "../problems.routes";

export const ProblemParams = t.Object({
  slug: t.String({ minLength: 3, maxLength: 64 }),
});

export const getProblemRoute = ({ getProblem }: ProblemsActions) =>
  defineRoute({
    params: ProblemParams,
    response: ProblemModel,
    summary: "Get a published problem, without what solvers must not see",
    description:
      "Answers the current version's statement, baseline, public drills and rubric weights. Hidden drills show only their titles, and the reference solution never leaves the server.",
    auth: true,

    action: ({ params }) => getProblem.execute({ slug: params.slug }),
    postAction: ({ output }) => ProblemEntity.normalize(output),
  });
