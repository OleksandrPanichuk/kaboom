import { AddressElement, Elements, useElements } from "@stripe/react-stripe-js";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { updateBillingDetailsMutation } from "@/features/billing/api";
import {
  billingErrorMessage,
  loadPaymentProvider,
  paymentAppearance,
} from "@/features/billing/utils";

interface BillingDetailsFormProps {
  name: string | null;
  submitLabel: string;
  onSaved: () => void;
}

function AddressFields({
  name,
  submitLabel,
  onSaved,
}: BillingDetailsFormProps) {
  const elements = useElements();
  const update = useMutation(updateBillingDetailsMutation);
  const [incomplete, setIncomplete] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const element = elements?.getElement("address");

    if (!element) return;

    const { complete, value } = await element.getValue();

    setIncomplete(!complete);

    if (!complete) return;

    update.mutate(
      {
        name: value.name,
        address: {
          line1: value.address.line1,
          line2: value.address.line2,
          city: value.address.city,
          state: value.address.state,
          postalCode: value.address.postal_code,
          country: value.address.country,
        },
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-5"
    >
      <AddressElement
        options={{
          mode: "billing",
          defaultValues: name ? { name } : undefined,
        }}
      />
      {incomplete ? (
        <FieldError>Fill in the address to continue.</FieldError>
      ) : null}
      {update.isError ? (
        <FieldError>{billingErrorMessage(update.error)}</FieldError>
      ) : null}
      <div>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function BillingDetailsForm(props: BillingDetailsFormProps) {
  const provider = loadPaymentProvider();

  if (!provider) {
    return (
      <p className="text-sm text-muted-foreground">
        Billing details cannot be changed here until payments are set up.
      </p>
    );
  }

  return (
    <Elements
      stripe={provider}
      options={{
        mode: "setup",
        currency: "usd",
        appearance: paymentAppearance(),
      }}
    >
      <AddressFields {...props} />
    </Elements>
  );
}
