import {
  type DesignGroup,
  GROUP_KIND_LABELS,
  type GroupKind,
} from "@repo/design";
import {
  Globe,
  Lock,
  type LucideIcon,
  MapPin,
  Network,
  Ungroup,
} from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";

import { DraftInput } from "./DraftInput";
import { InspectorSection } from "./InspectorSection";

const LABEL_MAX_LENGTH = 80;

const ICONS: Record<GroupKind, LucideIcon> = {
  region: MapPin,
  vpc: Network,
  "public-subnet": Globe,
  "private-subnet": Lock,
};

const ABOUT: Record<GroupKind, string> = {
  region:
    "A Region down fault stops every node in it at once. A synchronous call from one region to another adds 70 ms.",
  vpc: "A private network. Nothing outside it reaches its private subnets, and it reaches the internet only from a public subnet or through a NAT gateway there.",
  "public-subnet":
    "The internet can reach what sits here, unless a security group stops it. Load balancers and NAT gateways belong here.",
  "private-subnet":
    "Nothing outside the VPC reaches what sits here, and it calls out only through a NAT gateway in a public subnet.",
};

interface GroupInspectorProps {
  group: DesignGroup;
  members: string[];
  onRename: (label: string) => string | null;
  onDissolve: () => void;
}

export function GroupInspector({
  group,
  members,
  onRename,
  onDissolve,
}: GroupInspectorProps) {
  const kind = GROUP_KIND_LABELS[group.kind];
  const noun = group.kind === "vpc" ? kind : kind.toLowerCase();
  const Icon = ICONS[group.kind];
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-sky-200/70 bg-sky-50 text-sky-700">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">
            {group.label || kind}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {kind} · {members.length} {members.length === 1 ? "node" : "nodes"}
          </p>
        </div>
      </div>

      <p className="border-b px-4 py-3 text-sm leading-5 text-muted-foreground text-pretty">
        {ABOUT[group.kind]}
      </p>

      <InspectorSection title="General">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={`${id}-label`}>Name</FieldLabel>
          <DraftInput
            id={`${id}-label`}
            value={group.label}
            maxLength={LABEL_MAX_LENGTH}
            placeholder={kind}
            invalid={error !== null}
            onUnchanged={() => setError(null)}
            onCommit={(text) => setError(onRename(text.trim()))}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Nodes</p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {members.map((label, index) => (
              <li key={`${label}-${index}`} className="truncate">
                {label}
              </li>
            ))}
          </ul>
        </div>
      </InspectorSection>

      <div className="px-4 py-4">
        <Button variant="outline" className="w-full" onClick={onDissolve}>
          <Ungroup aria-hidden="true" />
          Remove {noun}, keep its nodes
        </Button>
      </div>
    </div>
  );
}
