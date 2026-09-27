import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft, Network } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/Empty";
import { designQuery } from "@/features/designs/api";

interface DesignViewProps {
  designId: string;
}

export function DesignView({ designId }: DesignViewProps) {
  const { data: design } = useSuspenseQuery(designQuery(designId));

  return (
    <div className="flex flex-1 flex-col bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-3xl font-semibold tracking-[-0.04em]">
            {design.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Revision {design.revision}
          </p>
        </div>
        <Empty className="flex-1 rounded-2xl border border-dashed border-black/10 bg-white/60">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-11 rounded-2xl border border-indigo-200/60 bg-indigo-50 text-indigo-700"
            >
              <Network aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>The canvas is on its way</EmptyTitle>
            <EmptyDescription>
              Soon you will place services, databases and queues here and
              connect them.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/designs"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ArrowLeft aria-hidden="true" />
              All designs
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  );
}
