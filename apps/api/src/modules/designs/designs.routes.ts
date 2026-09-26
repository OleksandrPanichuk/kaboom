import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  applyDesignOpsRoute,
  createDesignRoute,
  deleteDesignRoute,
  getDesignRevisionRoute,
  getDesignRoute,
  listDesignRevisionsRoute,
  listDesignsRoute,
  updateDesignRoute,
} from "./routes";
import type {
  ApplyDesignOpsUseCase,
  CreateDesignUseCase,
  DeleteDesignUseCase,
  GetDesignRevisionUseCase,
  GetDesignUseCase,
  ListDesignRevisionsUseCase,
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
  listDesignRevisions: Executable<ListDesignRevisionsUseCase>;
  getDesignRevision: Executable<GetDesignRevisionUseCase>;
}

export const designsRoutes = (actions: DesignsActions) =>
  new Elysia({ name: "designs", prefix: "/designs" })
    .post("/", ...createDesignRoute(actions))
    .get("/", ...listDesignsRoute(actions))
    .get("/:id", ...getDesignRoute(actions))
    .patch("/:id", ...updateDesignRoute(actions))
    .delete("/:id", ...deleteDesignRoute(actions))
    .post("/:id/ops", ...applyDesignOpsRoute(actions))
    .get("/:id/revisions", ...listDesignRevisionsRoute(actions))
    .get("/:id/revisions/:number", ...getDesignRevisionRoute(actions));
