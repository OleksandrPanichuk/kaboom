import { defineRoute } from "@/core/route";

import { ShareEntity } from "../share.entity";
import { ShareModel } from "../share.model";
import type { SharesActions } from "../shares.routes";
import { MyShareQuery } from "./share-params";

export const getMyShareRoute = ({ getMyShare }: SharesActions) =>
  defineRoute({
    query: MyShareQuery,
    response: ShareModel,
    summary: "Get the caller's live link to a design or an interview",
    description: "Answers 404 SHARE_NOT_FOUND when it is not shared.",
    auth: true,

    action: ({ query, user }) =>
      getMyShare.execute({
        ownerId: user.id,
        subject: query.subject,
        subjectId: query.subjectId,
      }),
    postAction: ({ output }) => ShareEntity.normalize(output),
  });
