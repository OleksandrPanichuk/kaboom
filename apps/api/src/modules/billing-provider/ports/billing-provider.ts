import { Port } from "@/core/port";
import type {
  BillingEventTopic,
  BillingProviderName,
  InvoiceStatus,
  PaymentAttemptStatus,
  PaymentStatus,
  PriceInterval,
  PriceType,
  RefundStatus,
  SubscriptionStatus,
  TaxBehavior,
  TaxExemptStatus,
} from "@/db";

export interface ProviderPrice {
  id: string;
  lookupKey: string | null;
  type: PriceType;
  interval: PriceInterval | null;
  intervalCount: number | null;
  unitAmount: number;
  currency: string;
  taxBehavior: TaxBehavior;
  active: boolean;
}

export interface ProviderEvent {
  id: string;
  type: string;
  topic: BillingEventTopic | null;
  objectId: string | null;
  customerId: string | null;
  live: boolean;
  createdAt: Date;
  payload: unknown;
}

export interface ProviderAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface ProviderCard {
  paymentMethodId: string;
  brand: string | null;
  last4: string | null;
}

export interface ProviderCustomer {
  id: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  address: ProviderAddress | null;
  card: ProviderCard | null;
  taxExempt: TaxExemptStatus;
  balance: number;
}

export interface ProviderSubscription {
  id: string;
  customerId: string;
  priceId: string;
  status: SubscriptionStatus;
  quantity: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: Date | null;
  canceledAt: Date | null;
  cancellationReason: string | null;
  endedAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  latestInvoiceId: string | null;
  createdAt: Date;
}

export interface ProviderInvoice {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  number: string | null;
  status: InvoiceStatus;
  billingReason: string | null;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  customerName: string | null;
  address: ProviderAddress | null;
  hostedUrl: string | null;
  pdfUrl: string | null;
  dueDate: Date | null;
  finalizedAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  priceIds: string[];
  paymentIds: string[];
  createdAt: Date;
}

export interface ProviderPaymentAttempt {
  id: string;
  status: PaymentAttemptStatus;
  amount: number;
  amountRefunded: number;
  currency: string;
  outcomeType: string | null;
  riskLevel: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  transactionId: string | null;
  fee: number | null;
  net: number | null;
  createdAt: Date;
}

export interface ProviderPayment {
  id: string;
  customerId: string | null;
  invoiceId: string | null;
  status: PaymentStatus;
  amount: number;
  amountReceived: number;
  currency: string;
  methodType: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  failureCode: string | null;
  declineCode: string | null;
  failureMessage: string | null;
  succeededAt: Date | null;
  attempts: ProviderPaymentAttempt[];
  createdAt: Date;
}

export interface ProviderRefund {
  id: string;
  customerId: string | null;
  paymentId: string | null;
  attemptId: string | null;
  invoiceId: string | null;
  creditNoteId: string | null;
  status: RefundStatus;
  amount: number;
  currency: string;
  reason: string | null;
  failureReason: string | null;
  createdAt: Date;
}

export interface ProviderDispute {
  id: string;
  customerId: string | null;
  paymentId: string | null;
  attemptId: string;
  invoiceId: string | null;
  status: string;
  outcome: "won" | "lost" | null;
  reason: string;
  amount: number;
  currency: string;
  evidenceDueBy: Date | null;
  createdAt: Date;
}

export interface ProviderTaxId {
  id: string;
  customerId: string;
  type: string;
  value: string;
  verificationStatus: string | null;
}

export abstract class BillingProvider extends Port {
  public abstract readonly name: BillingProviderName;

  public abstract readonly available: boolean;

  public abstract readonly signatureHeader: string;

  public abstract parseWebhook(
    payload: string,
    signature: string | null,
  ): Promise<ProviderEvent>;

  public abstract listEvents(since: Date): AsyncIterable<ProviderEvent>;

  public abstract findPrices(
    lookupKeys: readonly string[],
  ): Promise<ProviderPrice[]>;

  public abstract findCustomer(id: string): Promise<ProviderCustomer | null>;

  public abstract findSubscription(
    id: string,
  ): Promise<ProviderSubscription | null>;

  public abstract findInvoice(id: string): Promise<ProviderInvoice | null>;

  public abstract findPayment(id: string): Promise<ProviderPayment | null>;

  public abstract findRefund(id: string): Promise<ProviderRefund | null>;

  public abstract findDispute(id: string): Promise<ProviderDispute | null>;

  public abstract findTaxId(
    customerId: string,
    id: string,
  ): Promise<ProviderTaxId | null>;
}
