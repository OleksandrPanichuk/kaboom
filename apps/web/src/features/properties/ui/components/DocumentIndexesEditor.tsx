import {
  type DesignOp,
  DOCUMENT_INDEX_DIRECTIONS,
  type DocumentIndexDirection,
  fieldAt,
} from "@repo/design";
import { Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { documentRows } from "@/features/canvas";
import {
  addDocumentIndex,
  type CollectionNode,
  readableRefusal,
  removeDocumentIndex,
} from "@/features/properties/utils";

import { DraftInput } from "./DraftInput";
import type { CommitResult } from "./PropFieldControl";

interface DocumentIndexesEditorProps {
  collection: CollectionNode;
  onApply: (ops: DesignOp[]) => CommitResult;
}

const DIRECTION_LABELS: Readonly<Record<DocumentIndexDirection, string>> = {
  asc: "ascending",
  desc: "descending",
  text: "text",
};

interface DraftKey {
  path: string[];
  direction: DocumentIndexDirection;
}

export function DocumentIndexesEditor({
  collection,
  onApply,
}: DocumentIndexesEditorProps) {
  const id = useId();
  const [keys, setKeys] = useState<DraftKey[]>([]);
  const [unique, setUnique] = useState(false);
  const [sparse, setSparse] = useState(false);
  const [ttl, setTtl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { fields, indexes } = collection.props;
  const rows = documentRows(fields).filter(
    (row) =>
      row.field.type !== "object" &&
      !(row.field.type === "array" && row.field.of === "object"),
  );
  const nameOf = (path: readonly string[]) =>
    path[0] === "_id"
      ? "_id"
      : path
          .map(
            (_, position) =>
              fieldAt(fields, path.slice(0, position + 1))?.name ?? "?",
          )
          .join(".");
  const remaining = rows.filter(
    (row) => !keys.some((item) => item.path.join(".") === row.path.join(".")),
  );
  const single = keys.length === 1 ? fieldAt(fields, keys[0]!.path) : undefined;

  const add = () => {
    const seconds = Number(ttl);
    const refused = onApply([
      addDocumentIndex(collection, {
        keys,
        unique,
        ...(sparse ? { sparse: true } : {}),
        ...(single?.type === "date" &&
        ttl.trim() !== "" &&
        Number.isFinite(seconds)
          ? { ttlSeconds: Math.max(0, Math.round(seconds)) }
          : {}),
      }),
    ]);

    setError(refused === null ? null : readableRefusal(refused));

    if (!refused) {
      setKeys([]);
      setUnique(false);
      setSparse(false);
      setTtl("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {indexes.length === 0 ? (
        <p className="text-sm leading-5 text-muted-foreground">
          Only _id is indexed.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {indexes.map((index) => (
            <li
              key={index.id}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card py-1 pr-1 pl-2.5"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-xs">
                  {"{ "}
                  {index.keys
                    .map(
                      (item) =>
                        `${nameOf(item.path)}: ${item.direction === "text" ? '"text"' : item.direction === "desc" ? -1 : 1}`,
                    )
                    .join(", ")}
                  {" }"}
                </span>
                {index.unique ||
                index.sparse ||
                index.ttlSeconds !== undefined ? (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {[
                      index.unique ? "unique" : null,
                      index.sparse ? "sparse" : null,
                      index.ttlSeconds !== undefined
                        ? `expires after ${index.ttlSeconds} s`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove the index on ${index.keys.map((item) => nameOf(item.path)).join(", ")}`}
                onClick={() => {
                  const refused = onApply([
                    removeDocumentIndex(collection, index.id),
                  ]);

                  setError(refused === null ? null : readableRefusal(refused));
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2.5 rounded-xl border border-dashed border-border p-2.5">
        <p className="text-xs font-medium">New index</p>
        {keys.length > 0 ? (
          <ol className="flex flex-col gap-1">
            {keys.map((item, position) => (
              <li
                key={item.path.join(".")}
                className="flex min-w-0 items-center gap-1.5"
              >
                <span className="w-4 shrink-0 text-xs text-muted-foreground">
                  {position + 1}.
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {nameOf(item.path)}
                </span>
                <Select
                  value={item.direction}
                  items={DOCUMENT_INDEX_DIRECTIONS.map((value) => ({
                    value,
                    label: DIRECTION_LABELS[value],
                  }))}
                  onValueChange={(direction) => {
                    if (!direction) return;

                    setKeys((current) =>
                      current.map((entry, index) =>
                        index === position ? { ...entry, direction } : entry,
                      ),
                    );
                  }}
                >
                  <SelectTrigger
                    aria-label={`Order of ${nameOf(item.path)}`}
                    className="h-7 w-[7rem] text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_INDEX_DIRECTIONS.map((value) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {DIRECTION_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Leave ${nameOf(item.path)} out`}
                  onClick={() =>
                    setKeys((current) =>
                      current.filter((_, index) => index !== position),
                    )
                  }
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ol>
        ) : null}
        {remaining.length > 0 ? (
          <Select
            value={null}
            items={remaining.map((row) => ({
              value: row.path.join("."),
              label: nameOf(row.path),
            }))}
            onValueChange={(value) => {
              if (value)
                setKeys((current) => [
                  ...current,
                  { path: String(value).split("."), direction: "asc" },
                ]);
              setError(null);
            }}
          >
            <SelectTrigger
              aria-label={keys.length === 0 ? "First key" : "Next key"}
              className="w-full text-xs"
            >
              <SelectValue
                placeholder={
                  keys.length === 0 ? "Lead with a field" : "Then by…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {remaining.map((row) => (
                <SelectItem
                  key={row.path.join(".")}
                  value={row.path.join(".")}
                  className="font-mono text-xs"
                >
                  {nameOf(row.path)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {single?.type === "date" ? (
          <Field>
            <FieldLabel htmlFor={`${id}-ttl`} className="text-xs">
              Delete documents this many seconds after that date
            </FieldLabel>
            <DraftInput
              id={`${id}-ttl`}
              value={ttl}
              inputMode="numeric"
              placeholder="Never"
              invalid={false}
              onCommit={(text) => setTtl(text.trim())}
            />
          </Field>
        ) : null}
        <Field
          orientation="horizontal"
          className="items-center justify-between"
        >
          <FieldLabel htmlFor={`${id}-unique`} className="text-xs">
            Unique
          </FieldLabel>
          <Switch
            id={`${id}-unique`}
            checked={unique}
            onCheckedChange={setUnique}
          />
        </Field>
        <Field
          orientation="horizontal"
          className="items-center justify-between"
        >
          <FieldLabel htmlFor={`${id}-sparse`} className="text-xs">
            Skip documents without these fields
          </FieldLabel>
          <Switch
            id={`${id}-sparse`}
            checked={sparse}
            onCheckedChange={setSparse}
          />
        </Field>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={keys.length === 0}
          onClick={add}
        >
          <Plus aria-hidden="true" />
          Add index
        </Button>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
