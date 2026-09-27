import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  applyInterviewOpsRoute,
  getInterviewRoute,
  interviewEventsRoute,
  listInterviewsRoute,
  postInterviewMessageRoute,
  runInterviewSimulationRoute,
  saveInterviewLayoutRoute,
  startInterviewRoute,
  submitInterviewRoute,
} from "./routes";
import type {
  ApplyInterviewOpsUseCase,
  GetInterviewUseCase,
  ListInterviewsUseCase,
  PostInterviewMessageUseCase,
  RunInterviewSimulationUseCase,
  SaveInterviewLayoutUseCase,
  StartInterviewUseCase,
  SubmitInterviewUseCase,
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
    .post("/:id/submit", ...submitInterviewRoute(actions));
