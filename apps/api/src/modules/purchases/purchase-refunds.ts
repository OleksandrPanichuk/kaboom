import type { PurchaseStatus } from "@/db";

import type { PurchaseEntity } from "./purchase.entity";

export interface PurchaseRefunds {
  refunded?: number;
  disputeLost?: boolean;
}

export interface RefundedPurchase {
  status: PurchaseStatus;
  amountRefunded: number;
  refundedAt: Date | null;
}

const SETTLED: readonly PurchaseStatus[] = [
  "paid",
  "partially_refunded",
  "refunded",
];

const statusAfter = (
  purchase: PurchaseEntity,
  refunded: number,
  disputeLost: boolean,
): PurchaseStatus => {
  if (purchase.status === "refunded" || disputeLost) return "refunded";
  if (refunded >= purchase.amount) return "refunded";
  if (refunded > 0) return "partially_refunded";

  return "paid";
};

export const purchaseAfterRefunds = (
  purchase: PurchaseEntity,
  refunds: PurchaseRefunds,
  at: Date,
): RefundedPurchase | null => {
  if (!SETTLED.includes(purchase.status)) return null;

  const refunded = refunds.refunded ?? purchase.amountRefunded;
  const status = statusAfter(purchase, refunded, refunds.disputeLost ?? false);

  return {
    status,
    amountRefunded: refunded,
    refundedAt:
      status === "refunded" ? (purchase.refundedAt ?? at) : purchase.refundedAt,
  };
};
