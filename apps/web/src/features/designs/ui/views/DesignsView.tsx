import type { DesignModel } from "@repo/api-client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
  const [creating, setCreating] = useState(false);
  const designs = data.pages.flatMap((page) => page.items);

  return (
    <DesignsPage
      action={
        designs.length > 0 ? (
          <Button className="shrink-0" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            New design
          </Button>
        ) : null
      }
    >
      {designs.length === 0 ? (
        <DesignsEmpty onCreate={() => setCreating(true)} />
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
        open={creating}
        onOpenChange={setCreating}
        onCreated={onCreated}
      />
    </DesignsPage>
  );
}
