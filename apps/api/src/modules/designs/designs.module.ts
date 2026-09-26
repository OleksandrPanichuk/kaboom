import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { designsRoutes } from "./designs.routes";
import { DesignRevisionsRepository, DesignsRepository } from "./ports";
import {
  PostgresDesignRevisionsRepository,
  PostgresDesignsRepository,
} from "./repositories";
import {
  ApplyDesignOpsUseCase,
  CreateDesignUseCase,
  DeleteDesignUseCase,
  GetDesignRevisionUseCase,
  GetDesignUseCase,
  ListDesignRevisionsUseCase,
  ListDesignsUseCase,
  UpdateDesignUseCase,
} from "./use-cases";

export const designsModule = defineModule({
  name: "designs",

  register: () => {
    bind(DesignsRepository, () => new PostgresDesignsRepository());
    bind(
      DesignRevisionsRepository,
      () => new PostgresDesignRevisionsRepository(),
    );
  },

  routes: () =>
    designsRoutes({
      createDesign: makeUseCase(CreateDesignUseCase),
      listDesigns: makeUseCase(ListDesignsUseCase),
      getDesign: makeUseCase(GetDesignUseCase),
      updateDesign: makeUseCase(UpdateDesignUseCase),
      deleteDesign: makeUseCase(DeleteDesignUseCase),
      applyDesignOps: makeUseCase(ApplyDesignOpsUseCase),
      listDesignRevisions: makeUseCase(ListDesignRevisionsUseCase),
      getDesignRevision: makeUseCase(GetDesignRevisionUseCase),
    }),
});
