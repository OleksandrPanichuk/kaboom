import { loadStripe, type Stripe } from "@stripe/stripe-js";

let loading: Promise<Stripe | null> | undefined;

export const stripePublishableKey = (): string | undefined => {
  const key: unknown = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  return typeof key === "string" && key !== "" ? key : undefined;
};

export const loadPaymentProvider = (): Promise<Stripe | null> | null => {
  const key = stripePublishableKey();

  if (!key) return null;

  loading ??= loadStripe(key);

  return loading;
};
