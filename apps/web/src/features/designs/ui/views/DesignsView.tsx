import type { DesignModel } from "@repo/api-client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Database, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { designsQuery } from "@/features/designs/api";
import {
  CreateDesignDialog,
  DesignCard,
  DesignsEmpty,
  DesignsPage,
} from "@/features/designs/ui/components";

interface DesignsViewProps {
  onCreated: (design: DesignModel) => void;
}

export function DesignsView({ onCreated }: DesignsViewProps) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(designsQuery);
  const [creating, setCreating] = useState<"system" | "schema" | null>(null);
  const designs = data.pages.flatMap((page) => page.items);

  return (
    <DesignsPage
      action={
        designs.length > 0 ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCreating("schema")}>
              <Database aria-hidden="true" />
              New schema
            </Button>
            <Button onClick={() => setCreating("system")}>
              <Plus aria-hidden="true" />
              New design
            </Button>
          </div>
        ) : null
      }
    >
      {designs.length === 0 ? (
        <DesignsEmpty onCreate={() => setCreating("system")} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
            <DesignCard key={design.id} design={design} />
          ))}
        </ul>
      )}
      {hasNextPage ? (
        <Button
          variant="outline"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
      <CreateDesignDialog
        kind={creating ?? "system"}
        open={creating !== null}
        onOpenChange={(open) => {
          if (!open) setCreating(null);
        }}
        onCreated={onCreated}
      />
    </DesignsPage>
  );
}
