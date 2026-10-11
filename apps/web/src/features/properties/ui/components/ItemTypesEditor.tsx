import { type DesignOp, ITEM_ATTRIBUTE_TYPES, MAX_SHARDS } from "@repo/design";
import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  addItemAttribute,
  addItemType,
  type DynamoTableNode,
  keysInUse,
  readableRefusal,
  removeItemAttribute,
  removeItemType,
  renameItemType,
  setItemKey,
  updateItemAttribute,
} from "@/features/properties/utils";

import { DraftInput } from "./DraftInput";
import type { CommitResult } from "./PropFieldControl";

interface ItemTypesEditorProps {
  table: DynamoTableNode;
  onApply: (ops: DesignOp[]) => CommitResult;
}

const NAME = /^[a-z_][a-z0-9_]*$/i;

const NAME_RULE =
  "Use letters, digits and underscores, starting with a letter.";

export function ItemTypesEditor({ table, onApply }: ItemTypesEditorProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const keys = keysInUse(table);

  const apply = (op: DesignOp) => {
    const refused = onApply([op]);

    setError(refused === null ? null : readableRefusal(refused));
  };

  const named = (text: string, then: (name: string) => void) => {
    const name = text.trim();

    if (!NAME.test(name)) {
      setError(NAME_RULE);
      return;
    }

    then(name);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm leading-5 text-muted-foreground">
        Each kind of item the table holds. A key is a template:{" "}
        <code className="font-mono text-xs">{"ORDER#{createdAt}"}</code> puts{" "}
        <code className="font-mono text-xs">ORDER#</code> before the item's{" "}
        <code className="font-mono text-xs">createdAt</code>. Leave a key empty
        to keep the item out of the index it belongs to.
      </p>
      {table.props.items.map((item) => (
        <section
          key={item.id}
          aria-label={`Item type ${item.name}`}
          className="flex min-w-0 flex-col gap-2 rounded-xl border border-black/[0.07] bg-white p-2"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <DraftInput
                id={`${id}-${item.id}`}
                value={item.name}
                maxLength={63}
                invalid={false}
                onCommit={(text) =>
                  named(text, (name) =>
                    apply(renameItemType(table, item.id, name)),
                  )
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${item.name}`}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => apply(removeItemType(table, item.id))}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>

          {keys.length > 0 ? (
            <dl className="flex flex-col gap-1">
              {keys.map((key) => (
                <div key={key.id} className="flex min-w-0 items-center gap-2">
                  <dt className="w-16 shrink-0 truncate font-mono text-[11px] text-muted-foreground">
                    <label htmlFor={`${id}-${item.id}-${key.id}`}>
                      {key.name}
                    </label>
                  </dt>
                  <dd className="min-w-0 flex-1">
                    <DraftInput
                      id={`${id}-${item.id}-${key.id}`}
                      value={item.keys[key.id] ?? ""}
                      maxLength={255}
                      placeholder="not set"
                      invalid={false}
                      className="font-mono"
                      onCommit={(text) =>
                        apply(setItemKey(table, item.id, key.id, text.trim()))
                      }
                    />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <ul className="flex flex-col gap-1">
            {item.attributes.map((attribute) => (
              <li
                key={attribute.id}
                className="flex min-w-0 items-center gap-1"
              >
                <div className="min-w-0 flex-1">
                  <DraftInput
                    id={`${id}-${item.id}-${attribute.id}`}
                    value={attribute.name}
                    maxLength={63}
                    invalid={false}
                    className="h-7"
                    onCommit={(text) =>
                      named(text, (name) =>
                        apply(
                          updateItemAttribute(table, item.id, attribute.id, {
                            name,
                          }),
                        ),
                      )
                    }
                  />
                </div>
                <Select
                  value={attribute.type}
                  items={ITEM_ATTRIBUTE_TYPES.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  onValueChange={(type) => {
                    if (type)
                      apply(
                        updateItemAttribute(table, item.id, attribute.id, {
                          type,
                        }),
                      );
                  }}
                >
                  <SelectTrigger
                    aria-label={`Type of ${item.name}.${attribute.name}`}
                    className="h-7 w-[4.5rem] font-mono text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_ATTRIBUTE_TYPES.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="font-mono text-xs"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-[4.5rem] shrink-0">
                  <DraftInput
                    id={`${id}-${item.id}-${attribute.id}-shards`}
                    aria-label={`Shards of ${item.name}.${attribute.name}`}
                    title={`Write sharding: a suffix from 0 to N-1, at most ${MAX_SHARDS}`}
                    value={
                      attribute.shards === undefined
                        ? ""
                        : String(attribute.shards)
                    }
                    inputMode="numeric"
                    placeholder="shards"
                    invalid={false}
                    className="h-7"
                    onCommit={(text) => {
                      const shards = Number(text.trim());

                      apply(
                        updateItemAttribute(table, item.id, attribute.id, {
                          shards:
                            text.trim() === "" || !Number.isFinite(shards)
                              ? undefined
                              : Math.round(shards),
                        }),
                      );
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${item.name}.${attribute.name}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    apply(removeItemAttribute(table, item.id, attribute.id))
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="xs"
            className="self-start"
            onClick={() => apply(addItemAttribute(table, item.id))}
          >
            <Plus aria-hidden="true" />
            Attribute
          </Button>
        </section>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => apply(addItemType(table))}
      >
        <Plus aria-hidden="true" />
        Add item type
      </Button>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
