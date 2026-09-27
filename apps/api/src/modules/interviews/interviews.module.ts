import { NoopReviewScheduler } from "@/adapters/reviews/noop.review-scheduler";
import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { interviewsRoutes } from "./interviews.routes";
import {
  InterviewEventsRepository,
  InterviewMessagesRepository,
  InterviewsRepository,
  ReviewScheduler,
} from "./ports";
import {
  PostgresInterviewEventsRepository,
  PostgresInterviewMessagesRepository,
  PostgresInterviewsRepository,
} from "./repositories";
import {
  ApplyInterviewOpsUseCase,
  GetInterviewUseCase,
  ListInterviewsUseCase,
  PostInterviewMessageUseCase,
  RunInterviewSimulationUseCase,
  SaveInterviewLayoutUseCase,
  StartInterviewUseCase,
  SubmitInterviewUseCase,
} from "./use-cases";

export const interviewsModule = defineModule({
  name: "interviews",

  register: () => {
    bind(InterviewsRepository, () => new PostgresInterviewsRepository());
    bind(
      InterviewMessagesRepository,
      () => new PostgresInterviewMessagesRepository(),
    );
    bind(
      InterviewEventsRepository,
      () => new PostgresInterviewEventsRepository(),
    );

    const reviews = new NoopReviewScheduler();

    bind(ReviewScheduler, () => reviews);
  },

  routes: () =>
    interviewsRoutes({
      startInterview: makeUseCase(StartInterviewUseCase),
      listInterviews: makeUseCase(ListInterviewsUseCase),
      getInterview: makeUseCase(GetInterviewUseCase),
      postInterviewMessage: makeUseCase(PostInterviewMessageUseCase),
      applyInterviewOps: makeUseCase(ApplyInterviewOpsUseCase),
      saveInterviewLayout: makeUseCase(SaveInterviewLayoutUseCase),
      runInterviewSimulation: makeUseCase(RunInterviewSimulationUseCase),
      submitInterview: makeUseCase(SubmitInterviewUseCase),
    }),
});
