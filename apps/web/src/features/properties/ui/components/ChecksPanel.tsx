import { type LintHit, lints } from "@repo/design";
import { CircleCheck, Crosshair } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useWorkspacePanels } from "@/features/shell";

import { LintCallout } from "./LintCallout";

interface ChecksPanelProps {
  hits: LintHit[];
  onShow: (hit: LintHit) => void;
}

const titleOf = (hit: LintHit): string =>
  hit.lint in lints ? lints[hit.lint as keyof typeof lints].title : hit.lint;

export function ChecksPanel({ hits, onShow }: ChecksPanelProps) {
  const { closePanels } = useWorkspacePanels();
  const ordered = [
    ...hits.filter((hit) => hit.severity === "warning"),
    ...hits.filter((hit) => hit.severity !== "warning"),
  ];

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <CircleCheck aria-hidden="true" className="size-4" />
        </span>
        <p className="text-sm font-medium">No problems found</p>
        <p className="text-sm leading-5 text-muted-foreground text-pretty">
          Checks for single points of failure, unreachable nodes and dead ends
          run as you edit.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 p-3">
      {ordered.map((hit, index) => (
        <li key={`${hit.lint}-${hit.nodeIds.join("+")}-${index}`}>
          <LintCallout
            hit={hit}
            title={titleOf(hit)}
            action={
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 self-start"
                onClick={() => {
                  onShow(hit);
                  closePanels();
                }}
              >
                <Crosshair aria-hidden="true" />
                Show on canvas
              </Button>
            }
          />
        </li>
      ))}
    </ul>
  );
}
