import { sql } from "drizzle-orm";

import { paymentAttemptsSchema, paymentsSchema } from "@/db";
import { type DBExecutor, getExecutor, transaction } from "@/db/executor";

import type { PaymentEntity } from "../payment.entity";
import { PaymentsRepository, type SyncPaymentData } from "../ports";

export class PostgresPaymentsRepository extends PaymentsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public sync(data: SyncPaymentData, at: Date): Promise<PaymentEntity> {
    return transaction(async () => {
      const values = {
        providerCustomerId: data.customerId,
        providerInvoiceId: data.invoiceId,
        status: data.status,
        amount: data.amount,
        amountReceived: data.amountReceived,
        currency: data.currency,
        paymentMethodType: data.methodType,
        cardBrand: data.cardBrand,
        cardLast4: data.cardLast4,
        failureCode: data.failureCode,
        declineCode: data.declineCode,
        failureMessage: data.failureMessage,
        succeededAt: data.succeededAt,
        providerCreatedAt: data.createdAt,
        syncedAt: at,
        updatedAt: at,
      };

      const [row] = await this.db
        .insert(paymentsSchema)
        .values({
          provider: data.provider,
          providerPaymentId: data.id,
          userId: data.userId,
          ...values,
        })
        .onConflictDoUpdate({
          target: [paymentsSchema.provider, paymentsSchema.providerPaymentId],
          set: {
            ...values,
            userId: sql`coalesce(excluded.user_id, ${paymentsSchema.userId})`,
          },
        })
        .returning();

      for (const attempt of data.attempts) {
        const attemptValues = {
          providerPaymentId: data.id,
          providerCustomerId: data.customerId,
          status: attempt.status,
          amount: attempt.amount,
          amountRefunded: attempt.amountRefunded,
          currency: attempt.currency,
          outcomeType: attempt.outcomeType,
          riskLevel: attempt.riskLevel,
          failureCode: attempt.failureCode,
          failureMessage: attempt.failureMessage,
          providerTransactionId: attempt.transactionId,
          fee: attempt.fee,
          net: attempt.net,
          providerCreatedAt: attempt.createdAt,
          syncedAt: at,
          updatedAt: at,
        };

        await this.db
          .insert(paymentAttemptsSchema)
          .values({
            provider: data.provider,
            providerAttemptId: attempt.id,
            ...attemptValues,
          })
          .onConflictDoUpdate({
            target: [
              paymentAttemptsSchema.provider,
              paymentAttemptsSchema.providerAttemptId,
            ],
            set: attemptValues,
          });
      }

      return row!;
    });
  }
}
