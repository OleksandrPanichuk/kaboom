import { and, eq, ne, sql } from "drizzle-orm";

import type { Page, PageRequest } from "@/core/pagination";
import { type BillingProviderName, invoicesSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { Keyset } from "@/db/pagination";

import type { InvoiceEntity } from "../invoice.entity";
import { InvoicesRepository, type SyncInvoiceData } from "../ports";

const NEWEST_FIRST = new Keyset<InvoiceEntity>({
  sort: invoicesSchema.providerCreatedAt,
  id: invoicesSchema.id,
  direction: "desc",
  key: (invoice) => [invoice.providerCreatedAt, invoice.id],
});

export class PostgresInvoicesRepository extends InvoicesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async findByProviderId(
    provider: BillingProviderName,
    providerInvoiceId: string,
  ): Promise<InvoiceEntity | null> {
    const [row] = await this.db
      .select()
      .from(invoicesSchema)
      .where(
        and(
          eq(invoicesSchema.provider, provider),
          eq(invoicesSchema.providerInvoiceId, providerInvoiceId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public async listForUser(
    provider: BillingProviderName,
    userId: string,
    page: PageRequest,
  ): Promise<Page<InvoiceEntity>> {
    const rows = await this.db
      .select()
      .from(invoicesSchema)
      .where(
        and(
          eq(invoicesSchema.provider, provider),
          eq(invoicesSchema.userId, userId),
          ne(invoicesSchema.status, "draft"),
          NEWEST_FIRST.after(page.cursor),
        ),
      )
      .orderBy(...NEWEST_FIRST.orderBy())
      .limit(NEWEST_FIRST.limit(page));

    return NEWEST_FIRST.page(rows, page);
  }

  public async sync(data: SyncInvoiceData, at: Date): Promise<InvoiceEntity> {
    const values = {
      providerCustomerId: data.customerId,
      providerSubscriptionId: data.subscriptionId,
      number: data.number,
      status: data.status,
      billingReason: data.billingReason,
      currency: data.currency,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      amountDue: data.amountDue,
      amountPaid: data.amountPaid,
      amountRemaining: data.amountRemaining,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      customerName: data.customerName,
      addressLine1: data.address?.line1 ?? null,
      addressLine2: data.address?.line2 ?? null,
      addressCity: data.address?.city ?? null,
      addressState: data.address?.state ?? null,
      addressPostalCode: data.address?.postalCode ?? null,
      addressCountry: data.address?.country ?? null,
      hostedInvoiceUrl: data.hostedUrl,
      invoicePdfUrl: data.pdfUrl,
      dueDate: data.dueDate,
      finalizedAt: data.finalizedAt,
      paidAt: data.paidAt,
      voidedAt: data.voidedAt,
      providerCreatedAt: data.createdAt,
      syncedAt: at,
      updatedAt: at,
    };

    const [row] = await this.db
      .insert(invoicesSchema)
      .values({
        provider: data.provider,
        providerInvoiceId: data.id,
        userId: data.userId,
        ...values,
      })
      .onConflictDoUpdate({
        target: [invoicesSchema.provider, invoicesSchema.providerInvoiceId],
        set: {
          ...values,
          userId: sql`coalesce(excluded.user_id, ${invoicesSchema.userId})`,
        },
      })
      .returning();

    return row!;
  }
}
