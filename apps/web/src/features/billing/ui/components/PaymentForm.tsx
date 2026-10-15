import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";

interface PaymentFormProps {
  label: string;
  returnUrl: string;
  onPaid: () => void;
}

export function PaymentForm({ label, returnUrl, onPaid }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setPending(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "The payment did not go through.");

      return;
    }

    onPaid();
  };

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-5"
    >
      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setReady(true)}
      />
      {error ? <FieldError>{error}</FieldError> : null}
      <Button
        type="submit"
        size="lg"
        disabled={!stripe || !ready || pending}
        className="w-full"
      >
        <Lock aria-hidden="true" data-icon="inline-start" />
        {pending ? "Paying…" : label}
      </Button>
    </form>
  );
}
