import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";

import { DesignEntity } from "../design.entity";
import { DesignSummaryModel } from "../design.model";
import type { DesignsActions } from "../designs.routes";

export const listDesignsRoute = ({ listDesigns }: DesignsActions) =>
  defineRoute({
    query: PageQuery,
    response: PageModel(DesignSummaryModel),
    summary: "List your designs, newest first",
    auth: true,

    action: ({ query, user }) =>
      listDesigns.execute({ ownerId: user.id, page: toPageRequest(query) }),
    postAction: ({ output }) => mapPage(output, DesignEntity.normalizeSummary),
  });
