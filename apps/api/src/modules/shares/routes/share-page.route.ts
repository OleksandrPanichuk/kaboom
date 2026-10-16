import { t } from "elysia";

import { defineRoute } from "@/core/route";

import {
  SHARE_PAGE_CACHE_CONTROL,
  VIEW_SHARE_RATE_LIMIT,
} from "../shares.constants";
import type { SharesActions } from "../shares.routes";
import { ShareTokenParams } from "./share-params";

export const sharePageRoute = ({ openSharePage }: SharesActions) =>
  defineRoute({
    params: ShareTokenParams,
    response: t.String(),
    summary: "The link people hand out: a preview for crawlers, then the page",
    description:
      "An HTML page with Open Graph and Twitter tags for link previews, which sends a browser on to the shared page in the app. A link that is off sends it to the home page.",
    rateLimit: VIEW_SHARE_RATE_LIMIT,

    action: ({ params }) => openSharePage.execute({ token: params.token }),
    postAction: ({ output, set }) => {
      set.headers["cache-control"] = SHARE_PAGE_CACHE_CONTROL;
      set.headers["content-type"] = "text/html; charset=utf-8";

      return output;
    },
  });
