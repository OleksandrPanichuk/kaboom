import type { InvoiceRow } from "@/db";

import type { InvoiceModel } from "./invoices.model";

export interface InvoiceEntity extends InvoiceRow {}

export class InvoiceEntity {
  public static normalize(invoice: InvoiceEntity): InvoiceModel {
    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      amountRemaining: invoice.amountRemaining,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      hostedUrl: invoice.hostedInvoiceUrl,
      pdfUrl: invoice.invoicePdfUrl,
      paidAt: invoice.paidAt,
      createdAt: invoice.providerCreatedAt,
    };
  }
}
