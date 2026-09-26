import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";

import { DesignRevisionSummaryModel } from "../design.model";
import { DesignRevisionEntity } from "../design-revision.entity";
import type { DesignsActions } from "../designs.routes";
import { DesignParams } from "./design-params";

export const listDesignRevisionsRoute = ({
  listDesignRevisions,
}: DesignsActions) =>
  defineRoute({
    params: DesignParams,
    query: PageQuery,
    response: PageModel(DesignRevisionSummaryModel),
    summary: "List a design's revisions, newest first",
    auth: true,

    action: ({ params, query, user }) =>
      listDesignRevisions.execute({
        ownerId: user.id,
        id: params.id,
        page: toPageRequest(query),
      }),
    postAction: ({ output }) =>
      mapPage(output, DesignRevisionEntity.normalizeSummary),
  });
