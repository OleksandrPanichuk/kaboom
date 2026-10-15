import type { BillingOfferModel } from "@repo/api-client";
import { Elements } from "@stripe/react-stripe-js";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";

import { buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  billingAccountQuery,
  offersQuery,
  startCheckoutMutation,
} from "@/features/billing/api";
import {
  BillingDetailsForm,
  OrderSummary,
  PaymentForm,
} from "@/features/billing/ui/components";
import {
  billingErrorCode,
  billingErrorMessage,
  describeOffer,
  loadPaymentProvider,
  paymentAppearance,
} from "@/features/billing/utils";

interface CheckoutViewProps {
  offerKey: string;
  returnUrl: string;
  onPaid: () => void;
}

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm leading-6 text-muted-foreground">{children}</p>
      <div>
        <Link
          to="/pricing"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          See the plans
        </Link>
      </div>
    </div>
  );
}

function Payment({
  offer,
  returnUrl,
  onPaid,
}: {
  offer: BillingOfferModel;
  returnUrl: string;
  onPaid: () => void;
}) {
  const { data: account } = useSuspenseQuery(billingAccountQuery);
  const start = useMutation(startCheckoutMutation);
  const started = useRef(false);
  const provider = loadPaymentProvider();
  const { price, cadence } = describeOffer(offer);

  useEffect(() => {
    if (started.current) return;

    started.current = true;
    start.mutate({ offer: offer.key, type: offer.type });
  }, [offer.key, offer.type, start]);

  useEffect(() => {
    if (start.isSuccess && start.data.clientSecret === null) onPaid();
  }, [start.isSuccess, start.data, onPaid]);

  const code = billingErrorCode(start.error);

  if (code === "BILLING_ADDRESS_REQUIRED") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold">Your billing address</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Tax depends on where you are, so we need your address before taking
            the payment. It is printed on your invoices too.
          </p>
        </div>
        <BillingDetailsForm
          name={account.customer?.name ?? null}
          submitLabel="Continue to payment"
          onSaved={() => start.mutate({ offer: offer.key, type: offer.type })}
        />
      </div>
    );
  }

  if (code === "BILLING_ALREADY_PRO") {
    return (
      <Notice title="You already have Pro">
        {offer.type === "one_time"
          ? "Pro for life is already yours, so there is nothing more to buy."
          : "Your account already has Pro, so there is nothing to subscribe to."}
      </Notice>
    );
  }

  if (start.isError) {
    return (
      <Notice title="The payment could not start">
        {billingErrorMessage(start.error)}
      </Notice>
    );
  }

  if (!provider) {
    return (
      <Notice title="Payments are not set up">
        Card payments cannot be taken here yet.
      </Notice>
    );
  }

  if (!start.data?.clientSecret) {
    return (
      <div
        aria-busy="true"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
      >
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-semibold">Payment</h2>
        <p className="text-sm text-muted-foreground">
          Pay by card. It is saved for renewals, and you can change it any time.
        </p>
      </div>
      <Elements
        key={start.data.clientSecret}
        stripe={provider}
        options={{
          clientSecret: start.data.clientSecret,
          appearance: paymentAppearance(),
        }}
      >
        <PaymentForm
          label={
            offer.type === "recurring"
              ? `Subscribe for ${price} ${cadence}`
              : `Pay ${price}`
          }
          returnUrl={returnUrl}
          onPaid={onPaid}
        />
      </Elements>
    </div>
  );
}

export function CheckoutView({
  offerKey,
  returnUrl,
  onPaid,
}: CheckoutViewProps) {
  const { data: offers } = useSuspenseQuery(offersQuery);
  const offer = offers.find((candidate) => candidate.key === offerKey);

  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Link
          to="/pricing"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Plans
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance">
            Checkout
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            {offer
              ? `${offer.type === "recurring" ? "Pro, billed monthly" : "Pro for life, paid once"}. It starts as soon as the payment goes through.`
              : "Pro starts as soon as the payment goes through."}
          </p>
        </div>
        {offer ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <Payment offer={offer} returnUrl={returnUrl} onPaid={onPaid} />
            <OrderSummary offer={offer} />
          </div>
        ) : (
          <Notice title="That plan is not on sale">
            The link you followed names a plan we do not sell. Choose one from
            the plans page.
          </Notice>
        )}
      </div>
    </div>
  );
}
