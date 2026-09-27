import { t } from "elysia";

import {
  mapPage,
  PageModel,
  PageQueryFields,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";
import { PROBLEM_DIFFICULTIES } from "@/db";

import { ProblemEntity } from "../problem.entity";
import { ProblemSummaryModel } from "../problem.model";
import type { ProblemsActions } from "../problems.routes";

export const ListProblemsQuery = t.Object({
  ...PageQueryFields,
  track: t.Optional(t.String({ maxLength: 40 })),
  difficulty: t.Optional(
    t.Union(PROBLEM_DIFFICULTIES.map((difficulty) => t.Literal(difficulty))),
  ),
});

export const listProblemsRoute = ({ listProblems }: ProblemsActions) =>
  defineRoute({
    query: ListProblemsQuery,
    response: PageModel(ProblemSummaryModel),
    summary: "List the published problems",
    auth: true,

    action: ({ query }) =>
      listProblems.execute({
        track: query.track,
        difficulty: query.difficulty,
        page: toPageRequest(query),
      }),
    postAction: ({ output }) => mapPage(output, ProblemEntity.normalizeSummary),
  });
