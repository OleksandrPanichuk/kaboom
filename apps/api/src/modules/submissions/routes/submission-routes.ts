import { t } from "elysia";

import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { AttemptEntity, SubmissionEntity } from "../submission.entity";
import {
  AttemptModel,
  ProgressModel,
  RunResultModel,
  SubmissionModel,
} from "../submission.model";
import { RUN_RATE_LIMIT, SUBMIT_RATE_LIMIT } from "../submissions.constants";
import type { SubmissionsActions } from "../submissions.routes";

export const startProblemRoute = ({ startProblem }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    response: AttemptModel,
    summary: "Start a problem, or open the attempt already started",
    description:
      "Creates the solver's design from the current version's baseline and pins that version for every run and submission of the attempt. Starting again returns the same attempt.",
    auth: true,

    action: ({ params, user }) =>
      startProblem.execute({ userId: user.id, slug: params.slug }),
    postAction: ({ output }) => AttemptEntity.normalize(output),
  });

export const getAttemptRoute = ({ getAttempt }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    response: AttemptModel,
    summary: "Get the solver's attempt at a problem",
    auth: true,

    action: ({ params, user }) =>
      getAttempt.execute({ userId: user.id, slug: params.slug }),
    postAction: ({ output }) => AttemptEntity.normalize(output),
  });

export const runProblemRoute = ({ runProblem }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    response: RunResultModel,
    summary: "Run the attempt's design against the problem's public drills",
    auth: true,
    rateLimit: RUN_RATE_LIMIT,

    action: ({ params, user }) =>
      runProblem.execute({ userId: user.id, slug: params.slug }),
  });

export const SubmitSolutionInput = t.Object({
  revision: t.Optional(t.Integer({ minimum: 0 })),
});

export const submitSolutionRoute = ({ submitSolution }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    body: SubmitSolutionInput,
    response: SubmissionModel,
    summary:
      "Score the attempt's design against every drill and keep the result",
    description:
      "Hidden drills are reported by title and outcome only. Answers 409 SUBMISSION_REVISION_MISMATCH when the revision given is not the design's current one.",
    auth: true,
    rateLimit: SUBMIT_RATE_LIMIT,

    action: ({ params, body, user }) =>
      submitSolution.execute({
        userId: user.id,
        slug: params.slug,
        revision: body.revision,
      }),
    postAction: ({ output }) => SubmissionEntity.normalize(output),
  });

export const listSubmissionsRoute = ({ listSubmissions }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    query: PageQuery,
    response: PageModel(SubmissionModel),
    summary: "List the solver's submissions to a problem, newest first",
    auth: true,

    action: ({ params, query, user }) =>
      listSubmissions.execute({
        userId: user.id,
        slug: params.slug,
        page: toPageRequest(query),
      }),
    postAction: ({ output }) => mapPage(output, SubmissionEntity.normalize),
  });

export const getProgressRoute = ({ getProgress }: SubmissionsActions) =>
  defineRoute({
    response: ProgressModel,
    summary: "The solver's points, rank and best score per official problem",
    auth: true,

    action: ({ user }) => getProgress.execute({ userId: user.id }),
  });
