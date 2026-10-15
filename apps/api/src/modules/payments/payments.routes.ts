import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { listPaymentsRoute } from "./routes";
import type { ListPaymentsUseCase } from "./use-cases";

export interface PaymentsActions {
  listPayments: Executable<ListPaymentsUseCase>;
}

export const paymentsRoutes = (actions: PaymentsActions) =>
  new Elysia({ name: "payments", prefix: "/billing/payments" }).get(
    "/",
    ...listPaymentsRoute(actions),
  );
