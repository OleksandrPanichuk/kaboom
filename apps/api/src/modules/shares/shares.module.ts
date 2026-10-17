import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { PostgresSharesRepository } from "./repositories";
import { SharesRepository } from "./shares.repository";
import { sharesRoutes } from "./shares.routes";
import {
  CreateShareUseCase,
  GetMyShareUseCase,
  OpenSharePageUseCase,
  RenderShareImageUseCase,
  RevokeShareUseCase,
  ViewShareUseCase,
} from "./use-cases";

export const sharesModule = defineModule({
  name: "shares",

  register: () => {
    bind(SharesRepository, () => new PostgresSharesRepository());
  },

  routes: () =>
    sharesRoutes({
      createShare: makeUseCase(CreateShareUseCase),
      getMyShare: makeUseCase(GetMyShareUseCase),
      revokeShare: makeUseCase(RevokeShareUseCase),
      viewShare: makeUseCase(ViewShareUseCase),
      renderShareImage: makeUseCase(RenderShareImageUseCase),
      openSharePage: makeUseCase(OpenSharePageUseCase),
    }),
});
