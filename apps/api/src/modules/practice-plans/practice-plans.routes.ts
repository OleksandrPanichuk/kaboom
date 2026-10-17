import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  dropPracticePlanRoute,
  getCurrentPracticePlanRoute,
  startPracticePlanRoute,
} from "./routes";
import type {
  DropPracticePlanUseCase,
  GetCurrentPracticePlanUseCase,
  StartPracticePlanUseCase,
} from "./use-cases";

export interface PracticePlansActions {
  getCurrentPracticePlan: Executable<GetCurrentPracticePlanUseCase>;
  startPracticePlan: Executable<StartPracticePlanUseCase>;
  dropPracticePlan: Executable<DropPracticePlanUseCase>;
}

export const practicePlansRoutes = (actions: PracticePlansActions) =>
  new Elysia({ name: "practice-plans", prefix: "/practice-plans" })
    .get("/current", ...getCurrentPracticePlanRoute(actions))
    .post("/", ...startPracticePlanRoute(actions))
    .delete("/current", ...dropPracticePlanRoute(actions));
