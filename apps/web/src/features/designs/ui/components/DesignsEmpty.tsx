import { Network, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/Empty";

interface DesignsEmptyProps {
  onCreate: () => void;
}

export function DesignsEmpty({ onCreate }: DesignsEmptyProps) {
  return (
    <Empty className="rounded-2xl border border-dashed border-border bg-card/60 py-14">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-11 rounded-2xl border border-interactive-border/60 bg-interactive-surface text-interactive-foreground"
        >
          <Network aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No designs yet</EmptyTitle>
        <EmptyDescription>
          Sketch a system on the canvas, then see how it holds up under load.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreate}>
          <Plus aria-hidden="true" />
          Create your first design
        </Button>
      </EmptyContent>
    </Empty>
  );
}
