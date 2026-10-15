import { and, eq, sql } from "drizzle-orm";

import { type BillingProviderName, billingTaxIdsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { BillingTaxIdEntity } from "../billing-tax-id.entity";
import { BillingTaxIdsRepository, type SyncBillingTaxIdData } from "../ports";

export class PostgresBillingTaxIdsRepository extends BillingTaxIdsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async sync(
    data: SyncBillingTaxIdData,
    at: Date,
  ): Promise<BillingTaxIdEntity> {
    const values = {
      providerCustomerId: data.customerId,
      type: data.type,
      value: data.value,
      verificationStatus: data.verificationStatus,
      syncedAt: at,
      updatedAt: at,
    };

    const [row] = await this.db
      .insert(billingTaxIdsSchema)
      .values({
        provider: data.provider,
        providerTaxId: data.id,
        userId: data.userId,
        ...values,
      })
      .onConflictDoUpdate({
        target: [
          billingTaxIdsSchema.provider,
          billingTaxIdsSchema.providerTaxId,
        ],
        set: {
          ...values,
          userId: sql`coalesce(excluded.user_id, ${billingTaxIdsSchema.userId})`,
        },
      })
      .returning();

    return row!;
  }

  public async remove(
    provider: BillingProviderName,
    providerTaxId: string,
  ): Promise<void> {
    await this.db
      .delete(billingTaxIdsSchema)
      .where(
        and(
          eq(billingTaxIdsSchema.provider, provider),
          eq(billingTaxIdsSchema.providerTaxId, providerTaxId),
        ),
      );
  }
}
