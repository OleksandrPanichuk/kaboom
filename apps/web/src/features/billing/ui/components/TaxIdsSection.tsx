import { useMutation, useQuery } from "@tanstack/react-query";
import { Landmark } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { SettingsSection } from "@/components/SettingsSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  addTaxIdMutation,
  removeTaxIdMutation,
  taxIdsQuery,
} from "@/features/billing/api";
import { TAX_ID_TYPES, taxIdLabel } from "@/features/billing/constants";
import { billingErrorMessage } from "@/features/billing/utils";

const VERIFICATION: Record<string, string> = {
  pending: "Checking",
  verified: "Verified",
  unverified: "Not verified",
  unavailable: "Cannot be checked",
};

export function TaxIdsSection() {
  const id = useId();
  const taxIds = useQuery(taxIdsQuery);
  const add = useMutation(addTaxIdMutation);
  const remove = useMutation(removeTaxIdMutation);
  const [type, setType] = useState<string>(TAX_ID_TYPES[0].value);
  const [value, setValue] = useState("");
  const error = add.error ?? remove.error;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate(
      { type, value: value.trim() },
      { onSuccess: () => setValue("") },
    );
  };

  return (
    <SettingsSection
      title="Tax ids"
      description="A VAT or similar number, printed on your invoices."
      icon={Landmark}
    >
      <div className="flex flex-col gap-4">
        {taxIds.data && taxIds.data.length > 0 ? (
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-muted/60">
            {taxIds.data.map((taxId) => (
              <li
                key={taxId.id}
                className="flex items-center justify-between gap-3 p-3.5 sm:px-4"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-sm">
                    {taxId.value}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {taxIdLabel(taxId.type)}
                    {taxId.verificationStatus ? (
                      <Badge variant="outline">
                        {VERIFICATION[taxId.verificationStatus] ??
                          taxId.verificationStatus}
                      </Badge>
                    ) : null}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ taxIdId: taxId.id })}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <form
          onSubmit={submit}
          className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-type`}>Type</Label>
            <Select
              value={type}
              items={[...TAX_ID_TYPES]}
              onValueChange={(next) => {
                if (typeof next === "string") setType(next);
              }}
            >
              <SelectTrigger id={`${id}-type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAX_ID_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={`${id}-value`}>Number</Label>
            <Input
              id={`${id}-value`}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="DE123456789"
              maxLength={64}
              autoComplete="off"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={add.isPending || value.trim() === ""}
          >
            {add.isPending ? "Adding…" : "Add"}
          </Button>
        </form>
        {error ? <FieldError>{billingErrorMessage(error)}</FieldError> : null}
      </div>
    </SettingsSection>
  );
}
