import { defineModule } from "@/core/module";
import { bind, makeService, makeUseCase } from "@/core/registry";

import { ProblemsRepository } from "./ports";
import { problemsRoutes } from "./problems.routes";
import { ProblemsService } from "./problems.service";
import { PostgresProblemsRepository } from "./repositories";
import { GetProblemUseCase, ListProblemsUseCase } from "./use-cases";

export const problemsModule = defineModule({
  name: "problems",

  register: () => {
    bind(ProblemsRepository, () => new PostgresProblemsRepository());
  },

  start: async () => {
    await makeService(ProblemsService).syncOfficial();
  },

  routes: () =>
    problemsRoutes({
      listProblems: makeUseCase(ListProblemsUseCase),
      getProblem: makeUseCase(GetProblemUseCase),
    }),
});
