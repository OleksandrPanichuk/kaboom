import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  createShareRoute,
  getMyShareRoute,
  revokeShareRoute,
  shareImageRoute,
  sharePageRoute,
  viewShareRoute,
} from "./routes";
import type {
  CreateShareUseCase,
  GetMyShareUseCase,
  OpenSharePageUseCase,
  RenderShareImageUseCase,
  RevokeShareUseCase,
  ViewShareUseCase,
} from "./use-cases";

export interface SharesActions {
  createShare: Executable<CreateShareUseCase>;
  getMyShare: Executable<GetMyShareUseCase>;
  revokeShare: Executable<RevokeShareUseCase>;
  viewShare: Executable<ViewShareUseCase>;
  renderShareImage: Executable<RenderShareImageUseCase>;
  openSharePage: Executable<OpenSharePageUseCase>;
}

export const sharesRoutes = (actions: SharesActions) =>
  new Elysia({ name: "shares" })
    .post("/shares", ...createShareRoute(actions))
    .get("/shares/mine", ...getMyShareRoute(actions))
    .delete("/shares/:token", ...revokeShareRoute(actions))
    .get("/shared/:token", ...viewShareRoute(actions))
    .get("/shared/:token/image.png", ...shareImageRoute(actions))
    .get("/s/:token", ...sharePageRoute(actions));
