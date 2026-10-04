import {
  describeProps,
  type DesignNode,
  findTechnology,
  type NodePatch,
  PROVIDER_LABELS,
  technologiesFor,
} from "@repo/design";
import { useId, useState } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { TechnologyMark } from "@/features/canvas";

import { InspectorSection } from "./InspectorSection";
import { type CommitResult, PropFieldControl } from "./PropFieldControl";

interface TechnologySectionProps {
  node: DesignNode;
  onPatch: (patch: NodePatch) => CommitResult;
}

const GENERIC = "generic";

export function TechnologySection({ node, onPatch }: TechnologySectionProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const options = technologiesFor(node.kind);
  const chosen = node.technology
    ? findTechnology(node.technology.id, node.kind)
    : undefined;

  if (options.length === 0) return null;

  const items = [
    { value: GENERIC, label: "Generic", technology: undefined },
    ...options.map((option) => ({
      value: option.id,
      label: `${option.label} · ${PROVIDER_LABELS[option.provider]}`,
      technology: option,
    })),
  ];
  const settings = chosen ? describeProps(chosen.props) : [];
  const current = node.technology?.props ?? {};
  const stored = chosen?.props.safeParse(current);
  const values = chosen
    ? stored?.success
      ? stored.data
      : chosen.props.parse({})
    : {};

  return (
    <InspectorSection title="Technology">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={`${id}-technology`}>Product</FieldLabel>
        <Select
          value={chosen?.id ?? GENERIC}
          onValueChange={(value) =>
            setError(
              onPatch({
                technology:
                  value === GENERIC || value === null
                    ? null
                    : { id: String(value), props: {} },
              }),
            )
          }
          items={items}
        >
          <SelectTrigger id={`${id}-technology`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                label={item.label}
              >
                {item.technology ? (
                  <TechnologyMark
                    technology={item.technology}
                    className="w-6"
                  />
                ) : null}
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          {chosen
            ? chosen.summary
            : "Pick the product it runs on, and its own settings fill in the numbers below."}
        </FieldDescription>
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
      {chosen
        ? settings.map((field) => (
            <PropFieldControl
              key={`${chosen.id}:${field.key}`}
              field={field}
              value={values[field.key]}
              onCommit={(value) =>
                onPatch({
                  technology: {
                    id: chosen.id,
                    props: { ...current, [field.key]: value },
                  },
                })
              }
            />
          ))
        : null}
    </InspectorSection>
  );
}
