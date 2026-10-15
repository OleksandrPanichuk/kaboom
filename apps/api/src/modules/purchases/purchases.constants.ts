import type { InvoiceStatus, PurchaseStatus } from "@/db";

export const LIVE_PURCHASE_STATUSES: readonly PurchaseStatus[] = [
  "pending",
  "paid",
  "partially_refunded",
];

export const REFUNDED_PURCHASE_STATUSES: readonly PurchaseStatus[] = [
  "partially_refunded",
  "refunded",
];

export const PURCHASE_STATUS_BY_INVOICE: Readonly<
  Record<Exclude<InvoiceStatus, "draft">, PurchaseStatus>
> = {
  open: "pending",
  paid: "paid",
  void: "canceled",
  uncollectible: "failed",
};
