import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import {
  ProblemAttemptsRepository,
  SolutionRevealsRepository,
  SubmissionsRepository,
} from "./ports";
import {
  PostgresProblemAttemptsRepository,
  PostgresSolutionRevealsRepository,
  PostgresSubmissionsRepository,
} from "./repositories";
import { submissionsRoutes } from "./submissions.routes";
import {
  GetAttemptUseCase,
  GetProgressUseCase,
  ListSubmissionsUseCase,
  RevealHintUseCase,
  RevealSolutionsUseCase,
  RunProblemUseCase,
  StartProblemUseCase,
  SubmitSolutionUseCase,
  UpgradeAttemptUseCase,
} from "./use-cases";

export const submissionsModule = defineModule({
  name: "submissions",

  register: () => {
    bind(
      ProblemAttemptsRepository,
      () => new PostgresProblemAttemptsRepository(),
    );
    bind(SubmissionsRepository, () => new PostgresSubmissionsRepository());
    bind(
      SolutionRevealsRepository,
      () => new PostgresSolutionRevealsRepository(),
    );
  },

  routes: () =>
    submissionsRoutes({
      startProblem: makeUseCase(StartProblemUseCase),
      getAttempt: makeUseCase(GetAttemptUseCase),
      upgradeAttempt: makeUseCase(UpgradeAttemptUseCase),
      runProblem: makeUseCase(RunProblemUseCase),
      submitSolution: makeUseCase(SubmitSolutionUseCase),
      listSubmissions: makeUseCase(ListSubmissionsUseCase),
      getProgress: makeUseCase(GetProgressUseCase),
      revealHint: makeUseCase(RevealHintUseCase),
      revealSolutions: makeUseCase(RevealSolutionsUseCase),
    }),
});
