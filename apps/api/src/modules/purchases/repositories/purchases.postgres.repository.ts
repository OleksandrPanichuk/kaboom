import { and, eq, inArray, sql } from "drizzle-orm";

import { type BillingProviderName, purchasesSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import { PurchasesRepository, type SyncPurchaseData } from "../ports";
import type { PurchaseEntity } from "../purchase.entity";
import type { RefundedPurchase } from "../purchase-refunds";
import {
  LIVE_PURCHASE_STATUSES,
  REFUNDED_PURCHASE_STATUSES,
} from "../purchases.constants";

export class PostgresPurchasesRepository extends PurchasesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public listLive(
    provider: BillingProviderName,
    providerCustomerId: string,
  ): Promise<PurchaseEntity[]> {
    return this.db
      .select()
      .from(purchasesSchema)
      .where(
        and(
          eq(purchasesSchema.provider, provider),
          eq(purchasesSchema.providerCustomerId, providerCustomerId),
          inArray(purchasesSchema.status, [...LIVE_PURCHASE_STATUSES]),
        ),
      );
  }

  public async findByInvoice(
    provider: BillingProviderName,
    providerInvoiceId: string,
  ): Promise<PurchaseEntity | null> {
    const [row] = await this.db
      .select()
      .from(purchasesSchema)
      .where(
        and(
          eq(purchasesSchema.provider, provider),
          eq(purchasesSchema.providerInvoiceId, providerInvoiceId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public async recordRefunds(
    id: string,
    refunded: RefundedPurchase,
    at: Date,
  ): Promise<void> {
    await this.db
      .update(purchasesSchema)
      .set({ ...refunded, updatedAt: at })
      .where(eq(purchasesSchema.id, id));
  }

  public async sync(data: SyncPurchaseData, at: Date): Promise<PurchaseEntity> {
    const values = {
      providerCustomerId: data.providerCustomerId,
      providerPriceId: data.providerPriceId,
      providerPaymentId: data.providerPaymentId,
      amount: data.amount,
      currency: data.currency,
      paidAt: data.paidAt,
      updatedAt: at,
    };
    const refunded = sql.join(
      REFUNDED_PURCHASE_STATUSES.map((status) => sql`${status}`),
      sql`, `,
    );

    const [row] = await this.db
      .insert(purchasesSchema)
      .values({
        provider: data.provider,
        providerInvoiceId: data.providerInvoiceId,
        userId: data.userId,
        status: data.status,
        ...values,
      })
      .onConflictDoUpdate({
        target: [purchasesSchema.provider, purchasesSchema.providerInvoiceId],
        set: {
          ...values,
          userId: sql`coalesce(excluded.user_id, ${purchasesSchema.userId})`,
          status: sql`case when ${purchasesSchema.status} in (${refunded}) then ${purchasesSchema.status} else excluded.status end`,
        },
      })
      .returning();

    return row!;
  }
}
