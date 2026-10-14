import { and, eq, ne, or } from "drizzle-orm";

import { billingPricesSchema } from "@/db";
import { type DBExecutor, getExecutor, transaction } from "@/db/executor";

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
        const replaced = price.lookupKey
          ? or(
              eq(billingPricesSchema.offerId, price.offerId),
              eq(billingPricesSchema.lookupKey, price.lookupKey),
            )
          : eq(billingPricesSchema.offerId, price.offerId);

        await this.db
          .update(billingPricesSchema)
          .set({ lookupKey: null, active: false, updatedAt: at })
          .where(
            and(
              eq(billingPricesSchema.provider, price.provider),
              replaced,
              ne(billingPricesSchema.providerPriceId, price.id),
            ),
          );

        const values = {
          offerId: price.offerId,
          lookupKey: price.lookupKey,
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
}
