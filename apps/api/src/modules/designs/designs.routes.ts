import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  applyDesignOpsRoute,
  createDesignRoute,
  deleteDesignRoute,
  getDesignRoute,
  listDesignsRoute,
  updateDesignRoute,
} from "./routes";
import type {
  ApplyDesignOpsUseCase,
  CreateDesignUseCase,
  DeleteDesignUseCase,
  GetDesignUseCase,
  ListDesignsUseCase,
  UpdateDesignUseCase,
} from "./use-cases";

export interface DesignsActions {
  createDesign: Executable<CreateDesignUseCase>;
  listDesigns: Executable<ListDesignsUseCase>;
  getDesign: Executable<GetDesignUseCase>;
  updateDesign: Executable<UpdateDesignUseCase>;
  deleteDesign: Executable<DeleteDesignUseCase>;
  applyDesignOps: Executable<ApplyDesignOpsUseCase>;
}

export const designsRoutes = (actions: DesignsActions) =>
  new Elysia({ name: "designs", prefix: "/designs" })
    .post("/", ...createDesignRoute(actions))
    .get("/", ...listDesignsRoute(actions))
    .get("/:id", ...getDesignRoute(actions))
    .patch("/:id", ...updateDesignRoute(actions))
    .delete("/:id", ...deleteDesignRoute(actions))
    .post("/:id/ops", ...applyDesignOpsRoute(actions));
