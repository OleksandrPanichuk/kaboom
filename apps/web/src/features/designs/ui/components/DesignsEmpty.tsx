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
    <Empty className="rounded-2xl border border-dashed border-black/10 bg-white/60 py-14">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-11 rounded-2xl border border-indigo-200/60 bg-indigo-50 text-indigo-700"
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
