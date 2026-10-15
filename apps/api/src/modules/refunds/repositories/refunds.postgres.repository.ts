import { and, eq, sql } from "drizzle-orm";

import { type BillingProviderName, refundsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import { RefundsRepository, type SyncRefundData } from "../ports";
import type { RefundEntity } from "../refund.entity";

export class PostgresRefundsRepository extends RefundsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async sync(data: SyncRefundData, at: Date): Promise<RefundEntity> {
    const values = {
      providerAttemptId: data.attemptId,
      providerPaymentId: data.paymentId,
      providerInvoiceId: data.invoiceId,
      providerCreditNoteId: data.creditNoteId,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      reason: data.reason,
      failureReason: data.failureReason,
      providerCreatedAt: data.createdAt,
      syncedAt: at,
      updatedAt: at,
    };

    const [row] = await this.db
      .insert(refundsSchema)
      .values({
        provider: data.provider,
        providerRefundId: data.id,
        userId: data.userId,
        ...values,
      })
      .onConflictDoUpdate({
        target: [refundsSchema.provider, refundsSchema.providerRefundId],
        set: {
          ...values,
          userId: sql`coalesce(excluded.user_id, ${refundsSchema.userId})`,
        },
      })
      .returning();

    return row!;
  }

  public async totalRefunded(
    provider: BillingProviderName,
    providerInvoiceId: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${refundsSchema.amount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(refundsSchema)
      .where(
        and(
          eq(refundsSchema.provider, provider),
          eq(refundsSchema.providerInvoiceId, providerInvoiceId),
          eq(refundsSchema.status, "succeeded"),
        ),
      );

    return row?.total ?? 0;
  }
}
