import { defineRoute } from "@/core/route";

import { CreateShareInput } from "../dto";
import { ShareEntity } from "../share.entity";
import { ShareModel } from "../share.model";
import { CREATE_SHARE_RATE_LIMIT } from "../shares.constants";
import type { SharesActions } from "../shares.routes";

export const createShareRoute = ({ createShare }: SharesActions) =>
  defineRoute({
    body: CreateShareInput,
    response: ShareModel,
    summary: "Share a design or a reviewed interview with a public link",
    description:
      "Anyone with the link sees the design as it stands, read-only, and an interview's review without its transcript. Sharing what is already shared answers the same link. An interview is shared once its review is ready (409 SHARE_NEEDS_REVIEW).",
    auth: true,
    rateLimit: CREATE_SHARE_RATE_LIMIT,

    action: ({ body, user }) =>
      createShare.execute({
        ownerId: user.id,
        subject: body.subject,
        subjectId: body.subjectId,
      }),
    postAction: ({ output }) => ShareEntity.normalize(output),
  });
