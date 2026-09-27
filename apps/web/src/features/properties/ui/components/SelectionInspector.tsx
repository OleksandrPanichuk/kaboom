import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface SelectionInspectorProps {
  nodes: number;
  edges: number;
  onDelete: () => void;
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export function SelectionInspector({
  nodes,
  edges,
  onDelete,
}: SelectionInspectorProps) {
  const parts = [
    nodes > 0 ? plural(nodes, "node") : null,
    edges > 0 ? plural(edges, "edge") : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm font-semibold">{parts.join(" and ")} selected</p>
      <p className="text-sm leading-5 text-muted-foreground">
        Select a single node to edit it.
      </p>
      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 aria-hidden="true" />
        Delete selection
      </Button>
    </div>
  );
}
