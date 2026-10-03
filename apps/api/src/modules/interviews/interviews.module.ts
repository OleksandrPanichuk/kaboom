import { NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind, makeService, makeUseCase } from "@/core/registry";

import { TurnScheduler } from "./interviewer/scheduler";
import { PHASE_TICK_MS } from "./interviews.constants";
import { interviewsRoutes } from "./interviews.routes";
import {
  EvidenceNotesRepository,
  InterviewerTurnsRepository,
  InterviewEventsRepository,
  InterviewMessagesRepository,
  InterviewsRepository,
} from "./ports";
import {
  PostgresEvidenceNotesRepository,
  PostgresInterviewerTurnsRepository,
  PostgresInterviewEventsRepository,
  PostgresInterviewMessagesRepository,
  PostgresInterviewsRepository,
} from "./repositories";
import {
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

export const interviewsModule = defineModule({
  name: "interviews",

  register: ({ env }) => {
    bind(InterviewsRepository, () => new PostgresInterviewsRepository());
    bind(
      InterviewMessagesRepository,
      () => new PostgresInterviewMessagesRepository(),
    );
    bind(
      InterviewEventsRepository,
      () => new PostgresInterviewEventsRepository(),
    );

    bind(
      InterviewerTurnsRepository,
      () => new PostgresInterviewerTurnsRepository(),
    );
    bind(EvidenceNotesRepository, () => new PostgresEvidenceNotesRepository());

    return { tickMs: env.NODE_ENV === NodeEnv.Test ? 0 : PHASE_TICK_MS };
  },

  start: ({ state }) => {
    makeService(TurnScheduler).start({ tickMs: state.tickMs });
  },

  shutdown: () => makeService(TurnScheduler).shutdown(),

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
      triggerInterviewer: makeUseCase(TriggerInterviewerUseCase),
      interruptInterviewer: makeUseCase(InterruptInterviewerUseCase),
    }),
});
