import {
  appName,
  renderActionEmail,
  type RenderedEmail,
} from "./auth-email.templates";

interface BillingEmailOptions {
  name?: string;
  billingUrl: string;
}

const formatMoney = (amount: number, currency: string): string => {
  const format = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;

  return format.format(amount / 10 ** digits);
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const billingFooter = () =>
  `You get this email because of your ${appName()} plan.`;

export const renderProStartedEmail = (
  options: BillingEmailOptions & { lifetime: boolean },
): RenderedEmail => {
  const title = options.lifetime
    ? "You have Pro for life"
    : "Your Pro subscription has started";

  return {
    subject: title,
    ...renderActionEmail({
      name: options.name,
      actionUrl: options.billingUrl,
      title,
      preheader: `Thank you for supporting ${appName()}.`,
      description: options.lifetime
        ? "Your payment went through and Pro is yours for good. There is nothing more to pay."
        : "Your payment went through and Pro is active. It renews every month until you cancel, which you can do at any time from your billing settings.",
      actionLabel: "See your billing",
      noteText: "",
      ignoreText: billingFooter(),
    }),
  };
};

export const renderPaymentFailedEmail = (
  options: BillingEmailOptions,
): RenderedEmail => ({
  subject: "We could not take your payment",
  ...renderActionEmail({
    name: options.name,
    actionUrl: options.billingUrl,
    title: "We could not take your payment",
    preheader: "Update your card to keep Pro.",
    description:
      "Your bank declined the renewal of your Pro subscription. We will try again over the next few days; update your card before then to keep Pro without a break.",
    actionLabel: "Update your card",
    noteText: "",
    ignoreText: billingFooter(),
  }),
});

export const renderSubscriptionEndedEmail = (
  options: BillingEmailOptions & { endedAt: string },
): RenderedEmail => ({
  subject: "Your Pro subscription has ended",
  ...renderActionEmail({
    name: options.name,
    actionUrl: options.billingUrl,
    title: "Your Pro subscription has ended",
    preheader: `Pro ended on ${formatDate(options.endedAt)}.`,
    description: `Your Pro subscription ended on ${formatDate(options.endedAt)} and your account is back on Free. Everything you made is still there, and you can subscribe again at any time.`,
    actionLabel: "See your plan",
    noteText: "",
    ignoreText: billingFooter(),
  }),
});

export const renderPurchaseRefundedEmail = (
  options: BillingEmailOptions & { amount: number; currency: string },
): RenderedEmail => ({
  subject: "Your purchase was refunded",
  ...renderActionEmail({
    name: options.name,
    actionUrl: options.billingUrl,
    title: "Your purchase was refunded",
    preheader: `${formatMoney(options.amount, options.currency)} is on its way back to you.`,
    description: `We refunded ${formatMoney(options.amount, options.currency)} for Pro for life, so your account is back on Free. The money usually reaches your card within 5 to 10 days.`,
    actionLabel: "See your billing",
    noteText: "",
    ignoreText: billingFooter(),
  }),
});
