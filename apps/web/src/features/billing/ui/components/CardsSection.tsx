import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Plus } from "lucide-react";
import { useState } from "react";

import { SettingsSection } from "@/components/SettingsSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  cardsQuery,
  makeCardDefaultMutation,
  removeCardMutation,
} from "@/features/billing/api";
import {
  billingErrorMessage,
  loadPaymentProvider,
} from "@/features/billing/utils";

import { AddCardDialog } from "./AddCardDialog";

const brandName = (brand: string | null): string =>
  brand
    ? brand.replace(
        /(^|_)(\w)/g,
        (_match, space: string, letter: string) =>
          `${space ? " " : ""}${letter.toUpperCase()}`,
      )
    : "Card";

const expiry = (month: number | null, year: number | null): string | null =>
  month && year
    ? `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`
    : null;

export function CardsSection() {
  const cards = useQuery(cardsQuery);
  const makeDefault = useMutation(makeCardDefaultMutation);
  const remove = useMutation(removeCardMutation);
  const [adding, setAdding] = useState(false);
  const error = makeDefault.error ?? remove.error;
  const busy = makeDefault.isPending || remove.isPending;
  const canAdd = loadPaymentProvider() !== null;

  return (
    <SettingsSection
      title="Payment method"
      description="The card your invoices and renewals are charged to."
      icon={CreditCard}
    >
      <div className="flex flex-col gap-4">
        {cards.isPending ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : cards.data && cards.data.length > 0 ? (
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-muted/60">
            {cards.data.map((card) => (
              <li
                key={card.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-4"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {brandName(card.brand)} ending {card.last4 ?? "····"}
                    {card.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                  </span>
                  {expiry(card.expMonth, card.expYear) ? (
                    <span className="text-xs text-muted-foreground">
                      Expires {expiry(card.expMonth, card.expYear)}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  {card.isDefault ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => makeDefault.mutate({ cardId: card.id })}
                    >
                      Make default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => remove.mutate({ cardId: card.id })}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
            {cards.isError
              ? "Your cards could not be loaded."
              : "No card saved. One is saved when you subscribe, or add one here."}
          </p>
        )}
        {error ? <FieldError>{billingErrorMessage(error)}</FieldError> : null}
        <div>
          <Button
            variant="outline"
            disabled={!canAdd}
            onClick={() => setAdding(true)}
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add a card
          </Button>
        </div>
        <AddCardDialog open={adding} onOpenChange={setAdding} />
      </div>
    </SettingsSection>
  );
}
