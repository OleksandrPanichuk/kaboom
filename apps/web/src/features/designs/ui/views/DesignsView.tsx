import type { DesignModel } from "@repo/api-client";
import { useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Database, Plus } from "lucide-react";
import { useState } from "react";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { UpgradeNotice } from "@/features/billing";
import { designQuotaQuery, designsQuery } from "@/features/designs/api";
import type { DesignKind } from "@/features/designs/typedefs";
import {
  CreateDesignDialog,
  DesignRow,
  DesignsEmpty,
  DesignsPage,
} from "@/features/designs/ui/components";
import { describeDesignAllowance, designsFull } from "@/features/designs/utils";

interface DesignsViewProps {
  kind: DesignKind | null;
  onKindChange: (kind: DesignKind | null) => void;
  onCreated: (design: DesignModel) => void;
}

const ALL = "all";

const KIND_OPTIONS = [
  { value: ALL, label: "All" },
  { value: "system", label: "Systems" },
  { value: "schema", label: "Schemas" },
] as const;

export function DesignsView({
  kind,
  onKindChange,
  onCreated,
}: DesignsViewProps) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(designsQuery(kind));
  const { data: quota } = useQuery(designQuotaQuery);
  const [creating, setCreating] = useState<DesignKind | null>(null);
  const designs = data.pages.flatMap((page) => page.items);
  const filtered = kind !== null;
  const full = quota !== undefined && designsFull(quota);
  const allowance = quota ? describeDesignAllowance(quota) : null;

  return (
    <DesignsPage
      action={
        designs.length > 0 || filtered ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {allowance ? (
              <span className="basis-full text-sm text-muted-foreground tabular-nums sm:basis-auto">
                {allowance}
              </span>
            ) : null}
            <Button
              variant="outline"
              disabled={full}
              onClick={() => setCreating("schema")}
            >
              <Database aria-hidden="true" />
              New schema
            </Button>
            <Button disabled={full} onClick={() => setCreating("system")}>
              <Plus aria-hidden="true" />
              New design
            </Button>
          </div>
        ) : null
      }
    >
      {designs.length > 0 || filtered ? (
        <SegmentedControl
          name="kind"
          label="Kind"
          value={kind ?? ALL}
          options={KIND_OPTIONS}
          onChange={(next) =>
            onKindChange(next === "system" || next === "schema" ? next : null)
          }
        />
      ) : null}
      {full ? (
        <UpgradeNotice title="You have as many designs as Free keeps">
          Free keeps five designs of your own, schemas included. Designs a
          problem or an interview opens for you are not counted. Delete one to
          make room, or see what Pro adds.
        </UpgradeNotice>
      ) : null}
      {designs.length === 0 ? (
        <DesignsEmpty
          kind={kind ?? "system"}
          onCreate={() => setCreating(kind ?? "system")}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {designs.map((design) => (
            <DesignRow key={design.id} design={design} />
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
