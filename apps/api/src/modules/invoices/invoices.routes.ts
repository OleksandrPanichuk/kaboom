import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { listInvoicesRoute } from "./routes";
import type { ListInvoicesUseCase } from "./use-cases";

export interface InvoicesActions {
  listInvoices: Executable<ListInvoicesUseCase>;
}

export const invoicesRoutes = (actions: InvoicesActions) =>
  new Elysia({ name: "invoices", prefix: "/billing/invoices" }).get(
    "/",
    ...listInvoicesRoute(actions),
  );
