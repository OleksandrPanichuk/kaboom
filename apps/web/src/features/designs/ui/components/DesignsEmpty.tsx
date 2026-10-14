import { Database, Network, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/Empty";
import type { DesignKind } from "@/features/designs/typedefs";

interface DesignsEmptyProps {
  kind: DesignKind;
  onCreate: () => void;
}

const COPY = {
  system: {
    icon: Network,
    title: "No designs yet",
    description:
      "Sketch a system on the canvas, then see how it holds up under load.",
    action: "Create your first design",
  },
  schema: {
    icon: Database,
    title: "No schemas yet",
    description:
      "A schema holds databases and their tables. A database in any of your systems can name it.",
    action: "Create a schema",
  },
} as const;

export function DesignsEmpty({ kind, onCreate }: DesignsEmptyProps) {
  const copy = COPY[kind];

  return (
    <Empty className="rounded-2xl border border-dashed border-border bg-card/60 py-14">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-11 rounded-2xl border border-interactive-border/60 bg-interactive-surface text-interactive-foreground"
        >
          <copy.icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{copy.title}</EmptyTitle>
        <EmptyDescription>{copy.description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreate}>
          <Plus aria-hidden="true" />
          {copy.action}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
