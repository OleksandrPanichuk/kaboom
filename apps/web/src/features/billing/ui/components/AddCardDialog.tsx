import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  makeCardDefaultMutation,
  setUpCardMutation,
} from "@/features/billing/api";
import {
  billingErrorMessage,
  loadPaymentProvider,
  paymentAppearance,
} from "@/features/billing/utils";

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CardForm({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const makeDefault = useMutation(makeCardDefaultMutation);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setPending(true);
    setError(null);

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (result.error) {
      setPending(false);
      setError(result.error.message ?? "The card could not be saved.");

      return;
    }

    const method = result.setupIntent.payment_method;
    const cardId = typeof method === "string" ? method : method?.id;

    if (!cardId) {
      setPending(false);
      onSaved();

      return;
    }

    makeDefault.mutate(
      { cardId },
      {
        onSuccess: onSaved,
        onSettled: () => setPending(false),
      },
    );
  };

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-5"
    >
      <PaymentElement onReady={() => setReady(true)} />
      {error ? <FieldError>{error}</FieldError> : null}
      {makeDefault.isError ? (
        <FieldError>{billingErrorMessage(makeDefault.error)}</FieldError>
      ) : null}
      <Button type="submit" disabled={!stripe || !ready || pending}>
        {pending ? "Saving…" : "Save card"}
      </Button>
    </form>
  );
}

export function AddCardDialog({ open, onOpenChange }: AddCardDialogProps) {
  const setUp = useMutation(setUpCardMutation);
  const provider = loadPaymentProvider();
  const { mutate, reset } = setUp;

  useEffect(() => {
    if (open && provider) mutate();
    if (!open) reset();
  }, [open, provider, mutate, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a card</DialogTitle>
          <DialogDescription>
            It becomes the card your invoices and renewals are charged to.
          </DialogDescription>
        </DialogHeader>
        {setUp.isError ? (
          <FieldError>{billingErrorMessage(setUp.error)}</FieldError>
        ) : null}
        {provider && setUp.data ? (
          <Elements
            stripe={provider}
            options={{
              clientSecret: setUp.data.clientSecret,
              appearance: paymentAppearance(),
            }}
          >
            <CardForm onSaved={() => onOpenChange(false)} />
          </Elements>
        ) : provider && !setUp.isError ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
