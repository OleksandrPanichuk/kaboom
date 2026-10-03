import type { DesignGroup } from "@repo/design";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type {
  PlacementFields,
  RegionTarget,
} from "@/features/properties/typedefs";

import { RegionField } from "./RegionField";
import { SubnetField } from "./SubnetField";

interface SelectionInspectorProps {
  nodes: number;
  edges: number;
  groups: DesignGroup[];
  placement: PlacementFields;
  region: string | null | undefined;
  onRegionChange: (target: RegionTarget) => void;
  onDelete: () => void;
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export function SelectionInspector({
  nodes,
  edges,
  groups,
  placement,
  region,
  onRegionChange,
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
      {nodes > 0 && placement.regions ? (
        <RegionField
          regions={groups.filter((group) => group.kind === "region")}
          value={region ?? null}
          onChange={onRegionChange}
        />
      ) : null}
      {nodes > 0 && placement.subnets ? (
        <SubnetField
          groups={groups}
          value={region ?? null}
          onChange={onRegionChange}
        />
      ) : null}
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
