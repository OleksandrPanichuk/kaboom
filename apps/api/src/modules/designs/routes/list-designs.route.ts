import { t } from "elysia";

import {
  mapPage,
  PageModel,
  PageQueryFields,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";
import { DESIGN_KINDS, DESIGN_ORIGINS } from "@/db";

import { DesignEntity } from "../design.entity";
import { DesignSummaryModel } from "../design.model";
import type { DesignsActions } from "../designs.routes";

export const listDesignsRoute = ({ listDesigns }: DesignsActions) =>
  defineRoute({
    query: t.Object({
      ...PageQueryFields,
      kind: t.Optional(t.Union(DESIGN_KINDS.map((kind) => t.Literal(kind)))),
      origin: t.Optional(
        t.Union(DESIGN_ORIGINS.map((origin) => t.Literal(origin))),
      ),
    }),
    response: PageModel(DesignSummaryModel),
    summary: "List your designs, newest first",
    description:
      "Every design you own. `origin=sandbox` leaves out the ones a problem, an interview or a problem draft opened, which are the designs the plan counts.",
    auth: true,

    action: ({ query, user }) =>
      listDesigns.execute({
        ownerId: user.id,
        page: toPageRequest(query),
        kind: query.kind,
        origin: query.origin,
      }),
    postAction: ({ output }) => mapPage(output, DesignEntity.normalizeSummary),
  });
