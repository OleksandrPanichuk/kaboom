import { useId } from "react";

import { Field, FieldLabel } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { DURATIONS } from "@/features/simulation/constants";
import type { ScenarioDraft } from "@/features/simulation/typedefs";

import { NumberField } from "./NumberField";

interface ScenarioFormProps {
  draft: ScenarioDraft;
  onChange: (draft: ScenarioDraft) => void;
}

export function ScenarioForm({ draft, onChange }: ScenarioFormProps) {
  const id = useId();
  const { spike } = draft;
  const maxSeconds = draft.durationSeconds;

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={`${id}-duration`} className="text-xs">
          Duration
        </FieldLabel>
        <Select
          value={String(draft.durationSeconds)}
          onValueChange={(value) =>
            onChange({ ...draft, durationSeconds: Number(value) })
          }
          items={DURATIONS.map((item) => ({
            value: String(item.seconds),
            label: item.label,
          }))}
        >
          <SelectTrigger id={`${id}-duration`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map((item) => (
              <SelectItem key={item.seconds} value={String(item.seconds)}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex flex-col gap-3 rounded-xl border border-black/[0.07] p-3">
        <Field
          orientation="horizontal"
          className="items-center justify-between"
        >
          <FieldLabel htmlFor={`${id}-spike`}>Traffic spike</FieldLabel>
          <Switch
            id={`${id}-spike`}
            checked={spike.enabled}
            onCheckedChange={(enabled) =>
              onChange({ ...draft, spike: { ...spike, enabled } })
            }
          />
        </Field>
        {spike.enabled ? (
          <div className="flex gap-2">
            <NumberField
              label="Traffic"
              value={spike.multiplier}
              suffix="×"
              min={0}
              max={1_000}
              onChange={(multiplier) =>
                onChange({ ...draft, spike: { ...spike, multiplier } })
              }
            />
            <NumberField
              label="From"
              value={spike.at}
              suffix="s"
              min={0}
              max={maxSeconds}
              integer
              onChange={(at) => onChange({ ...draft, spike: { ...spike, at } })}
            />
            <NumberField
              label="Until"
              value={spike.until ?? maxSeconds}
              suffix="s"
              min={0}
              max={maxSeconds}
              integer
              onChange={(until) =>
                onChange({ ...draft, spike: { ...spike, until } })
              }
            />
          </div>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            Every client sends its usual rate for the whole run.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <NumberField
          label="Target p99"
          value={draft.sloP99Ms}
          suffix="ms"
          min={1}
          max={600_000}
          onChange={(sloP99Ms) => onChange({ ...draft, sloP99Ms })}
        />
        <NumberField
          label="Target availability"
          value={draft.sloAvailability}
          suffix="%"
          min={0}
          max={1}
          scale={100}
          onChange={(sloAvailability) =>
            onChange({ ...draft, sloAvailability })
          }
        />
      </div>
    </div>
  );
}
