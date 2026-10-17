import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { EmailPreferencesRepository } from "./email-preferences.repository";
import { emailPreferencesRoutes } from "./email-preferences.routes";
import { PostgresEmailPreferencesRepository } from "./repositories";
import {
  GetMyEmailPreferencesUseCase,
  UpdateMyEmailPreferencesUseCase,
} from "./use-cases";

export const emailPreferencesModule = defineModule({
  name: "email-preferences",

  register: () => {
    bind(
      EmailPreferencesRepository,
      () => new PostgresEmailPreferencesRepository(),
    );
  },

  routes: () =>
    emailPreferencesRoutes({
      getMyEmailPreferences: makeUseCase(GetMyEmailPreferencesUseCase),
      updateMyEmailPreferences: makeUseCase(UpdateMyEmailPreferencesUseCase),
    }),
});
