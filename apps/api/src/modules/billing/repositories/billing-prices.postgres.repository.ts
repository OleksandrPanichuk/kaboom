import { and, asc, eq, isNotNull, ne } from "drizzle-orm";

import { billingPricesSchema } from "@/db";
import { type DBExecutor, getExecutor, transaction } from "@/db/executor";

import type { BillingPriceEntity } from "../billing-price.entity";
import { BillingPricesRepository, type SyncPriceData } from "../ports";

export class PostgresBillingPricesRepository extends BillingPricesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public sync(prices: readonly SyncPriceData[], at: Date): Promise<void> {
    return transaction(async () => {
      for (const price of prices) {
        await this.db
          .update(billingPricesSchema)
          .set({ lookupKey: null, active: false, updatedAt: at })
          .where(
            and(
              eq(billingPricesSchema.provider, price.provider),
              eq(billingPricesSchema.lookupKey, price.lookupKey),
              ne(billingPricesSchema.providerPriceId, price.id),
            ),
          );

        const values = {
          lookupKey: price.lookupKey,
          planKey: price.planKey,
          type: price.type,
          interval: price.interval,
          intervalCount: price.intervalCount,
          unitAmount: price.unitAmount,
          currency: price.currency,
          taxBehavior: price.taxBehavior,
          active: price.active,
          syncedAt: at,
          updatedAt: at,
        };

        await this.db
          .insert(billingPricesSchema)
          .values({
            provider: price.provider,
            providerPriceId: price.id,
            ...values,
          })
          .onConflictDoUpdate({
            target: [
              billingPricesSchema.provider,
              billingPricesSchema.providerPriceId,
            ],
            set: values,
          });
      }
    });
  }

  public async listOffered(): Promise<BillingPriceEntity[]> {
    const rows = await this.db
      .select()
      .from(billingPricesSchema)
      .where(
        and(
          eq(billingPricesSchema.active, true),
          isNotNull(billingPricesSchema.lookupKey),
        ),
      )
      .orderBy(
        asc(billingPricesSchema.unitAmount),
        asc(billingPricesSchema.id),
      );

    return rows.filter(
      (row): row is BillingPriceEntity => row.lookupKey !== null,
    );
  }
}
