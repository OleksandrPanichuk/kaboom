import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { registerJob } from "@/platform/jobs";

import { RemindPracticePlansJob } from "./jobs";
import { PracticePlansRepository } from "./ports";
import { practicePlansRoutes } from "./practice-plans.routes";
import { PostgresPracticePlansRepository } from "./repositories";
import {
  DropPracticePlanUseCase,
  GetCurrentPracticePlanUseCase,
  StartPracticePlanUseCase,
} from "./use-cases";

export const practicePlansModule = defineModule({
  name: "practice-plans",

  register: () => {
    bind(PracticePlansRepository, () => new PostgresPracticePlansRepository());
    registerJob(RemindPracticePlansJob);
  },

  routes: () =>
    practicePlansRoutes({
      getCurrentPracticePlan: makeUseCase(GetCurrentPracticePlanUseCase),
      startPracticePlan: makeUseCase(StartPracticePlanUseCase),
      dropPracticePlan: makeUseCase(DropPracticePlanUseCase),
    }),
});
