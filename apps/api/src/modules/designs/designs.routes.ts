import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  applyDesignOpsRoute,
  createDesignRoute,
  deleteDesignRoute,
  getDesignQuotaRoute,
  getDesignRevisionRoute,
  getDesignRoute,
  listDesignRevisionsRoute,
  listDesignsRoute,
  saveDesignLayoutRoute,
  updateDesignRoute,
} from "./routes";
import type {
  ApplyDesignOpsUseCase,
  CreateDesignUseCase,
  DeleteDesignUseCase,
  GetDesignQuotaUseCase,
  GetDesignRevisionUseCase,
  GetDesignUseCase,
  ListDesignRevisionsUseCase,
  ListDesignsUseCase,
  SaveDesignLayoutUseCase,
  UpdateDesignUseCase,
} from "./use-cases";

export interface DesignsActions {
  createDesign: Executable<CreateDesignUseCase>;
  listDesigns: Executable<ListDesignsUseCase>;
  getDesignQuota: Executable<GetDesignQuotaUseCase>;
  getDesign: Executable<GetDesignUseCase>;
  updateDesign: Executable<UpdateDesignUseCase>;
  deleteDesign: Executable<DeleteDesignUseCase>;
  applyDesignOps: Executable<ApplyDesignOpsUseCase>;
  saveDesignLayout: Executable<SaveDesignLayoutUseCase>;
  listDesignRevisions: Executable<ListDesignRevisionsUseCase>;
  getDesignRevision: Executable<GetDesignRevisionUseCase>;
}

export const designsRoutes = (actions: DesignsActions) =>
  new Elysia({ name: "designs", prefix: "/designs" })
    .post("/", ...createDesignRoute(actions))
    .get("/", ...listDesignsRoute(actions))
    .get("/quota", ...getDesignQuotaRoute(actions))
    .get("/:id", ...getDesignRoute(actions))
    .patch("/:id", ...updateDesignRoute(actions))
    .delete("/:id", ...deleteDesignRoute(actions))
    .post("/:id/ops", ...applyDesignOpsRoute(actions))
    .put("/:id/layout", ...saveDesignLayoutRoute(actions))
    .get("/:id/revisions", ...listDesignRevisionsRoute(actions))
    .get("/:id/revisions/:number", ...getDesignRevisionRoute(actions));
