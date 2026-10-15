import { and, eq, inArray, sql } from "drizzle-orm";

import { billingEventsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { BillingEventEntity } from "../billing-event.entity";
import {
  BillingEventsRepository,
  type ReceiveBillingEventData,
  type ReceivedBillingEvent,
} from "../ports";

export class PostgresBillingEventsRepository extends BillingEventsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async receive(
    data: ReceiveBillingEventData,
  ): Promise<ReceivedBillingEvent> {
    const [inserted] = await this.db
      .insert(billingEventsSchema)
      .values({
        provider: data.provider,
        providerEventId: data.id,
        type: data.type,
        topic: data.topic,
        providerObjectId: data.objectId,
        providerCustomerId: data.customerId,
        live: data.live,
        payload: data.payload,
        providerCreatedAt: data.createdAt,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) return { event: inserted, duplicate: false };

    const [existing] = await this.db
      .select()
      .from(billingEventsSchema)
      .where(
        and(
          eq(billingEventsSchema.provider, data.provider),
          eq(billingEventsSchema.providerEventId, data.id),
        ),
      )
      .limit(1);

    return { event: existing!, duplicate: true };
  }

  public async claim(id: string): Promise<BillingEventEntity | null> {
    const [row] = await this.db
      .update(billingEventsSchema)
      .set({
        attempts: sql`${billingEventsSchema.attempts} + 1`,
        status: "pending",
      })
      .where(
        and(
          eq(billingEventsSchema.id, id),
          inArray(billingEventsSchema.status, ["pending", "failed"]),
        ),
      )
      .returning();

    return row ?? null;
  }

  public async settle(
    id: string,
    status: "processed" | "ignored",
    at: Date,
  ): Promise<void> {
    await this.db
      .update(billingEventsSchema)
      .set({ status, processedAt: at, lastError: null })
      .where(eq(billingEventsSchema.id, id));
  }

  public async recordError(
    id: string,
    message: string,
    final: boolean,
  ): Promise<void> {
    await this.db
      .update(billingEventsSchema)
      .set({ lastError: message, ...(final ? { status: "failed" } : {}) })
      .where(eq(billingEventsSchema.id, id));
  }
}
