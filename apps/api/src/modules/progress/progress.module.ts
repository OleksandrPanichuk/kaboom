import { defineModule } from "@/core/module";
import { makeUseCase } from "@/core/registry";

import { progressRoutes } from "./progress.routes";
import { GetActivityUseCase } from "./use-cases";

export const progressModule = defineModule({
  name: "progress",

  register: () => ({}),

  routes: () =>
    progressRoutes({ getActivity: makeUseCase(GetActivityUseCase) }),
});
