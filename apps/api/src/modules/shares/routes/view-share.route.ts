import { defineRoute } from "@/core/route";

import { ShareEntity } from "../share.entity";
import { SharedModel } from "../share.model";
import { VIEW_SHARE_RATE_LIMIT } from "../shares.constants";
import type { SharesActions } from "../shares.routes";
import { ShareTokenParams } from "./share-params";

export const viewShareRoute = ({ viewShare }: SharesActions) =>
  defineRoute({
    params: ShareTokenParams,
    response: SharedModel,
    summary: "Open a shared design or interview review, no sign-in needed",
    description:
      "Answers 404 SHARE_NOT_FOUND once the link is off or what it shared is gone.",
    rateLimit: VIEW_SHARE_RATE_LIMIT,

    action: ({ params }) => viewShare.execute({ token: params.token }),
    postAction: ({ output }) => ShareEntity.normalizeView(output),
  });
