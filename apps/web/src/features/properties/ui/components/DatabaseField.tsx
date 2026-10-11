import { type DesignGroup, type Engine, ENGINE_LABELS } from "@repo/design";
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
import { NEW_DATABASE, NO_REGION } from "@/features/properties/constants";
import type { RegionTarget } from "@/features/properties/typedefs";

const SQL_ENGINES: readonly Engine[] = ["postgres", "mysql", "sqlite"];

interface DatabaseFieldProps {
  databases: DesignGroup[];
  value: string | null;
  onChange: (target: RegionTarget) => void;
}

export function DatabaseField({
  databases,
  value,
  onChange,
}: DatabaseFieldProps) {
  const id = useId();
  const sql = databases.filter(
    (database) => database.engine && SQL_ENGINES.includes(database.engine),
  );
  const labelOf = (database: DesignGroup) =>
    `${database.label || "Database"} · ${database.engine ? ENGINE_LABELS[database.engine] : ""}`;
  const items = [
    { value: NO_REGION, label: "No database (PostgreSQL)" },
    ...sql.map((database) => ({
      value: database.id,
      label: labelOf(database),
    })),
    ...SQL_ENGINES.map((engine) => ({
      value: `${NEW_DATABASE}${engine}`,
      label: `New ${ENGINE_LABELS[engine]} database`,
    })),
  ];

  return (
    <Field>
      <FieldLabel htmlFor={`${id}-database`}>Database</FieldLabel>
      <Select
        value={
          value !== null && sql.some((database) => database.id === value)
            ? value
            : NO_REGION
        }
        items={items}
        onValueChange={(next) =>
          onChange(next === NO_REGION ? null : String(next))
        }
      >
        <SelectTrigger id={`${id}-database`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_REGION}>No database (PostgreSQL)</SelectItem>
          {sql.map((database) => (
            <SelectItem key={database.id} value={database.id}>
              {labelOf(database)}
            </SelectItem>
          ))}
          <SelectSeparator />
          {SQL_ENGINES.map((engine) => (
            <SelectItem key={engine} value={`${NEW_DATABASE}${engine}`}>
              New {ENGINE_LABELS[engine]} database
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>
        The engine decides which types, defaults and indexes the table may use,
        and how it is written as SQL.
      </FieldDescription>
    </Field>
  );
}
