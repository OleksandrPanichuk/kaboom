import { t } from "elysia";

import { defineRoute } from "@/core/route";

import {
  SHARE_IMAGE_CACHE_CONTROL,
  VIEW_SHARE_RATE_LIMIT,
} from "../shares.constants";
import type { SharesActions } from "../shares.routes";
import { ShareTokenParams } from "./share-params";

export const shareImageRoute = ({ renderShareImage }: SharesActions) =>
  defineRoute({
    params: ShareTokenParams,
    response: t.File(),
    summary: "The 1200×630 preview image of a shared link",
    rateLimit: VIEW_SHARE_RATE_LIMIT,

    action: ({ params }) => renderShareImage.execute({ token: params.token }),
    postAction: ({ output, set }) => {
      set.headers["cache-control"] = SHARE_IMAGE_CACHE_CONTROL;
      set.headers["content-type"] = "image/png";

      return new File([output], "share.png", { type: "image/png" });
    },
  });
