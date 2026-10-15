import { and, asc, eq } from "drizzle-orm";

import {
  billingOffersSchema,
  billingPricesSchema,
  type BillingProviderName,
} from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { BillingOfferEntity, OfferedPrice } from "../billing-offer.entity";
import { BillingOffersRepository } from "../ports";

export class PostgresBillingOffersRepository extends BillingOffersRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public listActive(): Promise<BillingOfferEntity[]> {
    return this.db
      .select()
      .from(billingOffersSchema)
      .where(eq(billingOffersSchema.active, true))
      .orderBy(asc(billingOffersSchema.position), asc(billingOffersSchema.key));
  }

  public async findOffered(
    provider: BillingProviderName,
    key: string,
  ): Promise<OfferedPrice | null> {
    const [row] = await this.db
      .select({ offer: billingOffersSchema, price: billingPricesSchema })
      .from(billingOffersSchema)
      .innerJoin(
        billingPricesSchema,
        and(
          eq(billingPricesSchema.offerId, billingOffersSchema.id),
          eq(billingPricesSchema.provider, provider),
          eq(billingPricesSchema.active, true),
        ),
      )
      .where(
        and(
          eq(billingOffersSchema.key, key),
          eq(billingOffersSchema.active, true),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public listOffered(provider: BillingProviderName): Promise<OfferedPrice[]> {
    return this.db
      .select({ offer: billingOffersSchema, price: billingPricesSchema })
      .from(billingOffersSchema)
      .innerJoin(
        billingPricesSchema,
        and(
          eq(billingPricesSchema.offerId, billingOffersSchema.id),
          eq(billingPricesSchema.provider, provider),
          eq(billingPricesSchema.active, true),
        ),
      )
      .where(eq(billingOffersSchema.active, true))
      .orderBy(asc(billingOffersSchema.position), asc(billingOffersSchema.key));
  }
}
