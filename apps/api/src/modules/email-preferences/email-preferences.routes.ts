import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  getMyEmailPreferencesRoute,
  updateMyEmailPreferencesRoute,
} from "./routes";
import type {
  GetMyEmailPreferencesUseCase,
  UpdateMyEmailPreferencesUseCase,
} from "./use-cases";

export interface EmailPreferencesActions {
  getMyEmailPreferences: Executable<GetMyEmailPreferencesUseCase>;
  updateMyEmailPreferences: Executable<UpdateMyEmailPreferencesUseCase>;
}

export const emailPreferencesRoutes = (actions: EmailPreferencesActions) =>
  new Elysia({ name: "email-preferences", prefix: "/email-preferences" })
    .get("/me", ...getMyEmailPreferencesRoute(actions))
    .patch("/me", ...updateMyEmailPreferencesRoute(actions));
