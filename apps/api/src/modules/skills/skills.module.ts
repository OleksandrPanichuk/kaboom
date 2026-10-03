import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { SkillScoresRepository } from "./ports";
import { PostgresSkillScoresRepository } from "./repositories";
import { skillsRoutes } from "./skills.routes";
import { GetMySkillsUseCase } from "./use-cases";

export const skillsModule = defineModule({
  name: "skills",

  register: () => {
    bind(SkillScoresRepository, () => new PostgresSkillScoresRepository());

    return {};
  },

  routes: () => skillsRoutes({ getMySkills: makeUseCase(GetMySkillsUseCase) }),
});
