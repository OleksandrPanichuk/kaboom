import { defineRoute } from "@/core/route";

import { ShareMessageModel } from "../share.model";
import type { SharesActions } from "../shares.routes";
import { ShareTokenParams } from "./share-params";

export const revokeShareRoute = ({ revokeShare }: SharesActions) =>
  defineRoute({
    params: ShareTokenParams,
    response: ShareMessageModel,
    summary: "Turn a shared link off",
    description:
      "The link stops working for good; sharing again makes a new one.",
    auth: true,

    action: ({ params, user }) =>
      revokeShare.execute({ ownerId: user.id, token: params.token }),
    postAction: () => ({ message: "ok" }),
  });
