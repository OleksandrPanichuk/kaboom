import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  listCardsRoute,
  makeCardDefaultRoute,
  removeCardRoute,
  setUpCardRoute,
} from "./routes";
import type {
  ListCardsUseCase,
  MakeCardDefaultUseCase,
  RemoveCardUseCase,
  SetUpCardUseCase,
} from "./use-cases";

export interface PaymentMethodsActions {
  setUpCard: Executable<SetUpCardUseCase>;
  listCards: Executable<ListCardsUseCase>;
  makeCardDefault: Executable<MakeCardDefaultUseCase>;
  removeCard: Executable<RemoveCardUseCase>;
}

export const paymentMethodsRoutes = (actions: PaymentMethodsActions) =>
  new Elysia({ name: "payment-methods", prefix: "/billing/cards" })
    .get("/", ...listCardsRoute(actions))
    .post("/setup", ...setUpCardRoute(actions))
    .put("/:cardId/default", ...makeCardDefaultRoute(actions))
    .delete("/:cardId", ...removeCardRoute(actions));
