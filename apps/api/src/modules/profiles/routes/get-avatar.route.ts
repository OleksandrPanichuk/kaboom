import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { AVATAR_CACHE_CONTROL } from "../profiles.constants";
import type { ProfilesActions } from "../profiles.routes";
import { AvatarParams } from "./avatar-params";

export const getAvatarRoute = ({ getAvatar }: ProfilesActions) =>
  defineRoute({
    params: AvatarParams,
    response: t.File(),
    summary: "Get an avatar image",
    description:
      "An avatar's file name changes with every upload, so the image is cached for good.",

    action: ({ params }) => getAvatar.execute({ file: params.file }),
    postAction: ({ output, set }) => {
      set.headers["cache-control"] = AVATAR_CACHE_CONTROL;
      set.headers["content-type"] = output.type;

      return output as File;
    },
  });
