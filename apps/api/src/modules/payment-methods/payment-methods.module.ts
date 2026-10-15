import { defineModule } from "@/core/module";
import { makeUseCase } from "@/core/registry";

import { paymentMethodsRoutes } from "./payment-methods.routes";
import {
  ListCardsUseCase,
  MakeCardDefaultUseCase,
  RemoveCardUseCase,
  SetUpCardUseCase,
} from "./use-cases";

export const paymentMethodsModule = defineModule({
  name: "payment-methods",

  routes: () =>
    paymentMethodsRoutes({
      setUpCard: makeUseCase(SetUpCardUseCase),
      listCards: makeUseCase(ListCardsUseCase),
      makeCardDefault: makeUseCase(MakeCardDefaultUseCase),
      removeCard: makeUseCase(RemoveCardUseCase),
    }),
});
