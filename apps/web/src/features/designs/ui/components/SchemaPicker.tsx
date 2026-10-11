import type { DesignNode, NodePatch } from "@repo/design";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Plus } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { errorMessage } from "@/features/auth";
import {
  createDesignMutation,
  schemaDesignsQuery,
} from "@/features/designs/api";

interface SchemaPickerProps {
  node: DesignNode;
  onPatch: (patch: NodePatch) => unknown;
}

const NONE = "none";

export function SchemaPicker({ node, onPatch }: SchemaPickerProps) {
  const id = useId();
  const { data, isPending } = useQuery(schemaDesignsQuery);
  const create = useMutation(createDesignMutation);
  const schemas = data?.items ?? [];
  const current = node.schema?.designId ?? null;
  const known = current === null || schemas.some((item) => item.id === current);
  const items = [
    { value: NONE, label: "None" },
    ...schemas.map((schema) => ({ value: schema.id, label: schema.name })),
    ...(known || isPending
      ? []
      : [{ value: current, label: "A schema you no longer have" }]),
  ];

  return (
    <Field>
      <FieldLabel htmlFor={`${id}-schema`}>Schema</FieldLabel>
      <Select
        value={current ?? NONE}
        items={items}
        onValueChange={(value) =>
          onPatch({
            schema:
              value === NONE || typeof value !== "string"
                ? null
                : { designId: value },
          })
        }
      >
        <SelectTrigger id={`${id}-schema`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>
        The tables this database holds, drawn in a schema design of their own.
      </FieldDescription>
      <div className="flex flex-wrap gap-2">
        {current && known ? (
          <Link
            to="/designs/$designId"
            params={{ designId: current }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:underline"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            Open schema
          </Link>
        ) : null}
        {current === null ? (
          <Button
            variant="outline"
            size="sm"
            disabled={create.isPending}
            onClick={() =>
              create.mutate(
                { name: `${node.label || node.id} schema`, kind: "schema" },
                {
                  onSuccess: (design) =>
                    onPatch({ schema: { designId: design.id } }),
                },
              )
            }
          >
            <Plus aria-hidden="true" />
            {create.isPending ? "Creating…" : "New schema"}
          </Button>
        ) : null}
      </div>
      {create.error ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(create.error)}
        </p>
      ) : null}
    </Field>
  );
}
