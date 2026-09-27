import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  applyInterviewOpsRoute,
  getInterviewRoute,
  interruptInterviewerRoute,
  interviewEventsRoute,
  listInterviewsRoute,
  postInterviewMessageRoute,
  runInterviewSimulationRoute,
  saveInterviewLayoutRoute,
  startInterviewRoute,
  submitInterviewRoute,
  triggerInterviewerRoute,
} from "./routes";
import type {
  ApplyInterviewOpsUseCase,
  GetInterviewUseCase,
  InterruptInterviewerUseCase,
  ListInterviewsUseCase,
  PostInterviewMessageUseCase,
  RunInterviewSimulationUseCase,
  SaveInterviewLayoutUseCase,
  StartInterviewUseCase,
  SubmitInterviewUseCase,
  TriggerInterviewerUseCase,
} from "./use-cases";

export interface InterviewsActions {
  startInterview: Executable<StartInterviewUseCase>;
  listInterviews: Executable<ListInterviewsUseCase>;
  getInterview: Executable<GetInterviewUseCase>;
  postInterviewMessage: Executable<PostInterviewMessageUseCase>;
  applyInterviewOps: Executable<ApplyInterviewOpsUseCase>;
  saveInterviewLayout: Executable<SaveInterviewLayoutUseCase>;
  runInterviewSimulation: Executable<RunInterviewSimulationUseCase>;
  submitInterview: Executable<SubmitInterviewUseCase>;
  triggerInterviewer: Executable<TriggerInterviewerUseCase>;
  interruptInterviewer: Executable<InterruptInterviewerUseCase>;
}

export const interviewsRoutes = (actions: InterviewsActions) =>
  new Elysia({ name: "interviews", prefix: "/interviews" })
    .post("/", ...startInterviewRoute(actions))
    .get("/", ...listInterviewsRoute(actions))
    .get("/:id", ...getInterviewRoute(actions))
    .get("/:id/events", ...interviewEventsRoute())
    .post("/:id/messages", ...postInterviewMessageRoute(actions))
    .post("/:id/ops", ...applyInterviewOpsRoute(actions))
    .put("/:id/layout", ...saveInterviewLayoutRoute(actions))
    .post("/:id/simulations", ...runInterviewSimulationRoute(actions))
    .post("/:id/triggers", ...triggerInterviewerRoute(actions))
    .post("/:id/interrupt", ...interruptInterviewerRoute(actions))
    .post("/:id/submit", ...submitInterviewRoute(actions));
