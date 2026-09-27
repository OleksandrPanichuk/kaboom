import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { ProblemAttemptsRepository, SubmissionsRepository } from "./ports";
import {
  PostgresProblemAttemptsRepository,
  PostgresSubmissionsRepository,
} from "./repositories";
import { submissionsRoutes } from "./submissions.routes";
import {
  GetAttemptUseCase,
  GetProgressUseCase,
  ListSubmissionsUseCase,
  RevealHintUseCase,
  RunProblemUseCase,
  StartProblemUseCase,
  SubmitSolutionUseCase,
} from "./use-cases";

export const submissionsModule = defineModule({
  name: "submissions",

  register: () => {
    bind(
      ProblemAttemptsRepository,
      () => new PostgresProblemAttemptsRepository(),
    );
    bind(SubmissionsRepository, () => new PostgresSubmissionsRepository());
  },

  routes: () =>
    submissionsRoutes({
      startProblem: makeUseCase(StartProblemUseCase),
      getAttempt: makeUseCase(GetAttemptUseCase),
      runProblem: makeUseCase(RunProblemUseCase),
      submitSolution: makeUseCase(SubmitSolutionUseCase),
      listSubmissions: makeUseCase(ListSubmissionsUseCase),
      getProgress: makeUseCase(GetProgressUseCase),
      revealHint: makeUseCase(RevealHintUseCase),
    }),
});
