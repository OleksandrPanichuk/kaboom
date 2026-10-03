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
import {
  NEW_PRIVATE_SUBNET,
  NEW_PUBLIC_SUBNET,
  NO_REGION,
} from "@/features/properties/constants";
import type { RegionTarget } from "@/features/properties/typedefs";

interface SubnetFieldProps {
  groups: DesignGroup[];
  value: string | null;
  onChange: (target: RegionTarget) => void;
}

export function SubnetField({ groups, value, onChange }: SubnetFieldProps) {
  const id = useId();
  const subnets = groups.filter(
    (group) =>
      group.kind === "public-subnet" || group.kind === "private-subnet",
  );
  const nameOf = (subnet: DesignGroup) => {
    const vpc = groups.find((group) => group.id === subnet.parentId);
    const kind = subnet.kind === "public-subnet" ? "public" : "private";

    return `${vpc?.label ? `${vpc.label} › ` : ""}${subnet.label || "Subnet"} (${kind})`;
  };
  const items = [
    { value: NO_REGION, label: "Outside any VPC" },
    ...subnets.map((subnet) => ({ value: subnet.id, label: nameOf(subnet) })),
    { value: NEW_PUBLIC_SUBNET, label: "New public subnet" },
    { value: NEW_PRIVATE_SUBNET, label: "New private subnet" },
  ];
  const current =
    value !== null && subnets.some((subnet) => subnet.id === value)
      ? value
      : NO_REGION;

  return (
    <Field>
      <FieldLabel htmlFor={`${id}-subnet`}>Subnet</FieldLabel>
      <Select
        value={current}
        items={items}
        onValueChange={(next) =>
          onChange(next === NO_REGION ? null : String(next))
        }
      >
        <SelectTrigger id={`${id}-subnet`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_REGION}>Outside any VPC</SelectItem>
          {subnets.map((subnet) => (
            <SelectItem key={subnet.id} value={subnet.id}>
              {nameOf(subnet)}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW_PUBLIC_SUBNET}>New public subnet</SelectItem>
          <SelectItem value={NEW_PRIVATE_SUBNET}>New private subnet</SelectItem>
        </SelectContent>
      </Select>
      <FieldDescription>
        The internet reaches a public subnet; a private one calls out only
        through a NAT gateway.
      </FieldDescription>
    </Field>
  );
}
