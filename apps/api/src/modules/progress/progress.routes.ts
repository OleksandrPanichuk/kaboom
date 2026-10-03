import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getActivityRoute } from "./routes";
import type { GetActivityUseCase } from "./use-cases";

export interface ProgressActions {
  getActivity: Executable<GetActivityUseCase>;
}

export const progressRoutes = (actions: ProgressActions) =>
  new Elysia({ name: "progress", prefix: "/progress" }).get(
    "/activity",
    ...getActivityRoute(actions),
  );
