import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Ellipsis, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";

import { SettingsSection } from "@/components/SettingsSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { FieldError } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  cardsQuery,
  makeCardDefaultMutation,
  removeCardMutation,
} from "@/features/billing/api";
import {
  billingErrorMessage,
  describeCard,
  loadPaymentProvider,
} from "@/features/billing/utils";

import { AddCardDialog } from "./AddCardDialog";
import { CardMark } from "./CardMark";

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
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {cards.data.map((card) => (
              <li
                key={card.id}
                className="flex items-center gap-3 bg-card p-3 sm:px-4"
              >
                <CardMark brand={card.brand} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="truncate">
                      {describeCard(card.brand, card.last4)}
                    </span>
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
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground"
                        disabled={busy}
                        aria-label={`Actions for ${describeCard(card.brand, card.last4)}`}
                      />
                    }
                  >
                    <Ellipsis aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    {card.isDefault ? null : (
                      <>
                        <DropdownMenuItem
                          onClick={() =>
                            makeDefault.mutate({ cardId: card.id })
                          }
                        >
                          <Star aria-hidden="true" />
                          Make default
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => remove.mutate({ cardId: card.id })}
                    >
                      <Trash2 aria-hidden="true" />
                      Remove card
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
            <CardMark brand={null} />
            {cards.isError
              ? "Your cards could not be loaded."
              : "No card saved yet. One is saved when you subscribe."}
          </div>
        )}
        {error ? <FieldError>{billingErrorMessage(error)}</FieldError> : null}
        <div>
          <Button
            variant="outline"
            size="sm"
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
