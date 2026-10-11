import { t } from "elysia";

import {
  mapPage,
  PageModel,
  PageQueryFields,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";
import { DESIGN_KINDS } from "@/db";

import { DesignEntity } from "../design.entity";
import { DesignSummaryModel } from "../design.model";
import type { DesignsActions } from "../designs.routes";

export const listDesignsRoute = ({ listDesigns }: DesignsActions) =>
  defineRoute({
    query: t.Object({
      ...PageQueryFields,
      kind: t.Optional(t.Union(DESIGN_KINDS.map((kind) => t.Literal(kind)))),
    }),
    response: PageModel(DesignSummaryModel),
    summary: "List your designs, newest first",
    auth: true,

    action: ({ query, user }) =>
      listDesigns.execute({
        ownerId: user.id,
        page: toPageRequest(query),
        kind: query.kind,
      }),
    postAction: ({ output }) => mapPage(output, DesignEntity.normalizeSummary),
  });
