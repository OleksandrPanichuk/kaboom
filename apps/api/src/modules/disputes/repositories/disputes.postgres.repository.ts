import { sql } from "drizzle-orm";

import { disputesSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { DisputeEntity } from "../dispute.entity";
import { DisputesRepository, type SyncDisputeData } from "../ports";

export class PostgresDisputesRepository extends DisputesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async sync(data: SyncDisputeData, at: Date): Promise<DisputeEntity> {
    const values = {
      providerAttemptId: data.attemptId,
      providerPaymentId: data.paymentId,
      status: data.status,
      reason: data.reason,
      amount: data.amount,
      currency: data.currency,
      evidenceDueBy: data.evidenceDueBy,
      providerCreatedAt: data.createdAt,
      syncedAt: at,
      updatedAt: at,
    };
    const closedAt = data.closed ? at : null;

    const [row] = await this.db
      .insert(disputesSchema)
      .values({
        provider: data.provider,
        providerDisputeId: data.id,
        userId: data.userId,
        closedAt,
        ...values,
      })
      .onConflictDoUpdate({
        target: [disputesSchema.provider, disputesSchema.providerDisputeId],
        set: {
          ...values,
          userId: sql`coalesce(excluded.user_id, ${disputesSchema.userId})`,
          closedAt: data.closed
            ? sql`coalesce(${disputesSchema.closedAt}, excluded.closed_at)`
            : null,
        },
      })
      .returning();

    return row!;
  }
}
