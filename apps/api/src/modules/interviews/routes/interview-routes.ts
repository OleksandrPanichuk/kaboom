import { parseDesignOps } from "@repo/design";
import { t } from "elysia";

import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";
import {
  AppliedDesignOpsModel,
  ApplyDesignOpsInput,
  DesignMessageModel,
  DesignOpRejectedError,
  SaveDesignLayoutInput,
} from "@/modules/designs";
import { SimulationRunEntity, SimulationRunModel } from "@/modules/simulations";

import {
  PostInterviewMessageInput,
  RunInterviewSimulationInput,
  StartInterviewInput,
} from "../dto";
import { InterviewEntity, InterviewMessageEntity } from "../interview.entity";
import {
  InterviewMessageModel,
  InterviewModel,
  InterviewStatusModel,
  InterviewSummaryModel,
} from "../interview.model";
import {
  INTERVIEW_MESSAGE_RATE_LIMIT,
  INTERVIEW_OPS_RATE_LIMIT,
  INTERVIEW_SIMULATION_RATE_LIMIT,
  INTERVIEW_TRIGGER_RATE_LIMIT,
  START_INTERVIEW_RATE_LIMIT,
} from "../interviews.constants";
import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const startInterviewRoute = ({ startInterview }: InterviewsActions) =>
  defineRoute({
    body: StartInterviewInput,
    response: InterviewModel,
    summary: "Start an interview on a problem",
    description:
      "Pins the problem's current version, creates the design from its baseline and posts the interviewer's opening message. Answers 409 INTERVIEW_ALREADY_ACTIVE with the id of an interview still running, and 422 PROBLEM_NOT_INTERVIEWABLE for a problem without an interview.",
    auth: true,
    rateLimit: START_INTERVIEW_RATE_LIMIT,

    action: ({ body, user }) =>
      startInterview.execute({ ownerId: user.id, slug: body.slug }),
    postAction: ({ output }) => InterviewEntity.normalize(output),
  });

export const listInterviewsRoute = ({ listInterviews }: InterviewsActions) =>
  defineRoute({
    query: PageQuery,
    response: PageModel(InterviewSummaryModel),
    summary: "List the user's interviews, newest first",
    auth: true,

    action: ({ query, user }) =>
      listInterviews.execute({ ownerId: user.id, page: toPageRequest(query) }),
    postAction: ({ output }) =>
      mapPage(output, InterviewEntity.normalizeSummary),
  });

export const getInterviewRoute = ({ getInterview }: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    response: InterviewModel,
    summary: "Get an interview with its messages",
    description:
      "Includes lastSeq: open GET /interviews/:id/events with since=lastSeq to receive every event after this state exactly once.",
    auth: true,

    action: ({ params, user }) =>
      getInterview.execute({ ownerId: user.id, id: params.id }),
    postAction: ({ output }) => InterviewEntity.normalize(output),
  });

export const postInterviewMessageRoute = ({
  postInterviewMessage,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: PostInterviewMessageInput,
    response: InterviewMessageModel,
    summary: "Say something to the interviewer",
    description:
      "Stores the message and answers at once; the interviewer's reply arrives on the event stream.",
    auth: true,
    rateLimit: INTERVIEW_MESSAGE_RATE_LIMIT,

    action: ({ params, body, user }) =>
      postInterviewMessage.execute({
        ownerId: user.id,
        id: params.id,
        body: body.body,
      }),
    postAction: ({ output }) => InterviewMessageEntity.normalize(output),
  });

export const applyInterviewOpsRoute = ({
  applyInterviewOps,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: ApplyDesignOpsInput,
    response: AppliedDesignOpsModel,
    summary: "Change the interview's design",
    description:
      "The same contract as POST /designs/:id/ops, and it tells the interviewer. Answers 409 INTERVIEW_NOT_ACTIVE once the interview has ended.",
    auth: true,
    rateLimit: INTERVIEW_OPS_RATE_LIMIT,

    action: ({ params, body, user }) => {
      const parsed = parseDesignOps(body.ops);

      if (!parsed.ok) throw new DesignOpRejectedError(parsed);

      return applyInterviewOps.execute({
        ownerId: user.id,
        id: params.id,
        author: "user",
        baseRevision: body.baseRevision,
        ops: parsed.ops,
      });
    },
    postAction: ({ output }) => ({
      revision: output.revision,
      graph: output.graph,
      graphHash: output.graphHash,
    }),
  });

export const saveInterviewLayoutRoute = ({
  saveInterviewLayout,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: SaveDesignLayoutInput,
    response: DesignMessageModel,
    summary: "Save where the interview design's nodes sit",
    auth: true,
    rateLimit: INTERVIEW_OPS_RATE_LIMIT,

    action: ({ params, body, user }) =>
      saveInterviewLayout.execute({
        ownerId: user.id,
        id: params.id,
        layout: body.layout,
      }),
    postAction: () => ({ message: "ok" }),
  });

export const runInterviewSimulationRoute = ({
  runInterviewSimulation,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: RunInterviewSimulationInput,
    response: SimulationRunModel,
    summary: "Run the interview's design under a scenario",
    auth: true,
    rateLimit: INTERVIEW_SIMULATION_RATE_LIMIT,

    action: ({ params, body, user }) =>
      runInterviewSimulation.execute({
        ownerId: user.id,
        id: params.id,
        scenario: body.scenario,
      }),
    postAction: ({ output }) => SimulationRunEntity.normalize(output),
  });

export const triggerInterviewerRoute = ({
  triggerInterviewer,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: t.Object({ kind: t.Literal("design-settled") }),
    response: t.Object({ accepted: t.Boolean() }),
    summary: "Tell the interviewer the design has settled",
    description:
      "The client sends design-settled once the candidate has stopped editing for a few seconds. The interviewer decides whether to speak, and interjects at most once a minute on its own.",
    auth: true,
    rateLimit: INTERVIEW_TRIGGER_RATE_LIMIT,

    action: async ({ params, body, user, set }) => {
      await triggerInterviewer.execute({
        ownerId: user.id,
        id: params.id,
        trigger: body.kind,
      });
      set.status = 202;
    },
    postAction: () => ({ accepted: true }),
  });

export const interruptInterviewerRoute = ({
  interruptInterviewer,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: t.Optional(t.Object({})),
    response: t.Object({ interrupted: t.Boolean() }),
    summary: "Stop the interviewer mid-turn",
    description:
      "Aborts the turn in progress: it applies no further tool, and what it had said so far is kept, marked as interrupted.",
    auth: true,

    action: async ({ params, user, set }) => {
      const result = await interruptInterviewer.execute({
        ownerId: user.id,
        id: params.id,
      });

      set.status = 202;

      return result;
    },
  });

export const submitInterviewRoute = ({ submitInterview }: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: t.Optional(t.Object({})),
    response: InterviewStatusModel,
    summary: "End the interview and hand it to review",
    description:
      "Locks the design at its current revision and moves the interview to reviewing. Submitting again changes nothing.",
    auth: true,

    action: ({ params, user }) =>
      submitInterview.execute({ ownerId: user.id, id: params.id }),
    postAction: ({ output }) => ({ status: output.status }),
  });
