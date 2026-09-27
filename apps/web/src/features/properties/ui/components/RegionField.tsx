import type { DesignGroup } from "@repo/design";
import { useId } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { NEW_REGION, NO_REGION } from "@/features/properties/constants";
import type { RegionTarget } from "@/features/properties/typedefs";

interface RegionFieldProps {
  regions: DesignGroup[];
  value: string | null;
  onChange: (target: RegionTarget) => void;
}

export function RegionField({ regions, value, onChange }: RegionFieldProps) {
  const id = useId();
  const items = [
    { value: NO_REGION, label: "No region" },
    ...regions.map((region) => ({
      value: region.id,
      label: region.label || "Region",
    })),
    { value: NEW_REGION, label: "New region" },
  ];

  return (
    <Field>
      <FieldLabel htmlFor={`${id}-region`}>Region</FieldLabel>
      <Select
        value={value ?? NO_REGION}
        items={items}
        onValueChange={(next) =>
          onChange(next === NO_REGION ? null : String(next))
        }
      >
        <SelectTrigger id={`${id}-region`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_REGION}>No region</SelectItem>
          {regions.map((region) => (
            <SelectItem key={region.id} value={region.id}>
              {region.label || "Region"}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW_REGION}>New region</SelectItem>
        </SelectContent>
      </Select>
      <FieldDescription>
        Nodes in a region fail together, and a call between regions takes
        longer.
      </FieldDescription>
    </Field>
  );
}
