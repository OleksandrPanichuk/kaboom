import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { addTaxIdRoute, listTaxIdsRoute, removeTaxIdRoute } from "./routes";
import type {
  AddTaxIdUseCase,
  ListTaxIdsUseCase,
  RemoveTaxIdUseCase,
} from "./use-cases";

export interface BillingTaxIdsActions {
  listTaxIds: Executable<ListTaxIdsUseCase>;
  addTaxId: Executable<AddTaxIdUseCase>;
  removeTaxId: Executable<RemoveTaxIdUseCase>;
}

export const billingTaxIdsRoutes = (actions: BillingTaxIdsActions) =>
  new Elysia({ name: "billing-tax-ids", prefix: "/billing/tax-ids" })
    .get("/", ...listTaxIdsRoute(actions))
    .post("/", ...addTaxIdRoute(actions))
    .delete("/:taxIdId", ...removeTaxIdRoute(actions));
