import { and, eq, isNull, ne, sql } from "drizzle-orm";

import {
  billingCustomersSchema,
  type BillingProviderName,
  usersSchema,
} from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { BillingCustomerEntity } from "../billing-customer.entity";
import {
  BillingCustomersRepository,
  type SyncBillingCustomerData,
} from "../ports";

export class PostgresBillingCustomersRepository extends BillingCustomersRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async lock(
    provider: BillingProviderName,
    providerCustomerId: string,
  ): Promise<void> {
    await this.db.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`billing-customer:${provider}:${providerCustomerId}`}))`,
    );
  }

  public async lockUser(userId: string): Promise<void> {
    await this.db.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`billing-user:${userId}`}))`,
    );
  }

  public async findByUser(
    provider: BillingProviderName,
    userId: string,
  ): Promise<BillingCustomerEntity | null> {
    const [row] = await this.db
      .select()
      .from(billingCustomersSchema)
      .where(
        and(
          eq(billingCustomersSchema.provider, provider),
          eq(billingCustomersSchema.userId, userId),
          isNull(billingCustomersSchema.deletedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public async findByProviderId(
    provider: BillingProviderName,
    providerCustomerId: string,
  ): Promise<BillingCustomerEntity | null> {
    const [row] = await this.db
      .select()
      .from(billingCustomersSchema)
      .where(
        and(
          eq(billingCustomersSchema.provider, provider),
          eq(billingCustomersSchema.providerCustomerId, providerCustomerId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public async sync(
    data: SyncBillingCustomerData,
    at: Date,
  ): Promise<BillingCustomerEntity> {
    const values = {
      email: data.email,
      name: data.name,
      addressLine1: data.address?.line1 ?? null,
      addressLine2: data.address?.line2 ?? null,
      addressCity: data.address?.city ?? null,
      addressState: data.address?.state ?? null,
      addressPostalCode: data.address?.postalCode ?? null,
      addressCountry: data.address?.country ?? null,
      providerPaymentMethodId: data.card?.paymentMethodId ?? null,
      cardBrand: data.card?.brand ?? null,
      cardLast4: data.card?.last4 ?? null,
      taxExempt: data.taxExempt,
      balance: data.balance,
      deletedAt: null,
      syncedAt: at,
      updatedAt: at,
    };

    const [row] = await this.db
      .insert(billingCustomersSchema)
      .values({
        provider: data.provider,
        providerCustomerId: data.id,
        userId: this.linkableUser(data),
        ...values,
      })
      .onConflictDoUpdate({
        target: [
          billingCustomersSchema.provider,
          billingCustomersSchema.providerCustomerId,
        ],
        set: {
          ...values,
          userId: sql`coalesce(excluded.user_id, ${billingCustomersSchema.userId})`,
        },
      })
      .returning();

    return row!;
  }

  public async markDeleted(
    provider: BillingProviderName,
    providerCustomerId: string,
    at: Date,
  ): Promise<void> {
    await this.db
      .update(billingCustomersSchema)
      .set({ deletedAt: at, syncedAt: at, updatedAt: at })
      .where(
        and(
          eq(billingCustomersSchema.provider, provider),
          eq(billingCustomersSchema.providerCustomerId, providerCustomerId),
          isNull(billingCustomersSchema.deletedAt),
        ),
      );
  }

  private linkableUser({ provider, id, userId }: SyncBillingCustomerData) {
    if (userId === null) return null;

    const linked = this.db
      .select({ id: billingCustomersSchema.id })
      .from(billingCustomersSchema)
      .where(
        and(
          eq(billingCustomersSchema.provider, provider),
          eq(billingCustomersSchema.userId, userId),
          ne(billingCustomersSchema.providerCustomerId, id),
        ),
      );

    return sql<
      string | null
    >`(select ${usersSchema.id} from ${usersSchema} where ${usersSchema.id} = ${userId} and not exists (${linked}))`;
  }
}
