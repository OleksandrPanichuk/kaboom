import type { PaymentAttemptRow, PaymentRow } from "@/db";

import type { PaymentModel } from "./payments.model";

export interface PaymentEntity extends PaymentRow {}

export interface PaymentAttemptEntity extends PaymentAttemptRow {}

export class PaymentEntity {
  public static normalize(payment: PaymentEntity): PaymentModel {
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      amountReceived: payment.amountReceived,
      currency: payment.currency,
      methodType: payment.paymentMethodType,
      cardBrand: payment.cardBrand,
      cardLast4: payment.cardLast4,
      failureMessage: payment.failureMessage,
      succeededAt: payment.succeededAt,
      createdAt: payment.providerCreatedAt,
    };
  }
}
