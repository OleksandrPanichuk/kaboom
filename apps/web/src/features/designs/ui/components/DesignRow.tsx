import type { DesignSummaryModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Database, Ellipsis, Network, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { formatEditedAt } from "@/features/designs/utils";

import { DeleteDesignDialog } from "./DeleteDesignDialog";
import { RenameDesignDialog } from "./RenameDesignDialog";

interface DesignRowProps {
  design: DesignSummaryModel;
}

type OpenDialog = "rename" | "delete" | null;

const KIND_LABELS = { system: "System", schema: "Schema" } as const;

export function DesignRow({ design }: DesignRowProps) {
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const schema = design.kind === "schema";

  return (
    <li className="relative grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 transition-colors hover:bg-muted/40 has-[a:focus-visible]:bg-muted/40 sm:px-5 lg:grid-cols-[2.25rem_minmax(0,1fr)_6rem_9rem_auto]">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl border",
          schema
            ? "border-border bg-muted/60 text-subtle-foreground"
            : "border-interactive-border/60 bg-interactive-surface text-interactive-foreground",
        )}
      >
        {schema ? (
          <Database aria-hidden="true" className="size-4" />
        ) : (
          <Network aria-hidden="true" className="size-4" />
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          to="/designs/$designId"
          params={{ designId: design.id }}
          className="font-semibold tracking-[-0.015em] break-words outline-none after:absolute after:inset-0"
        >
          {design.name}
        </Link>
        <p className="text-xs text-muted-foreground lg:hidden">
          {KIND_LABELS[design.kind]} ·{" "}
          <time dateTime={design.updatedAt}>
            {formatEditedAt(design.updatedAt)}
          </time>
        </p>
      </div>
      <span className="hidden text-sm text-muted-foreground lg:block">
        {KIND_LABELS[design.kind]}
      </span>
      <time
        dateTime={design.updatedAt}
        className="hidden text-sm text-muted-foreground lg:block"
      >
        {formatEditedAt(design.updatedAt)}
      </time>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative z-[1] shrink-0 text-muted-foreground"
              aria-label={`Actions for ${design.name}`}
            />
          }
        >
          <Ellipsis aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={() => setDialog("rename")}>
            <Pencil aria-hidden="true" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDialog("delete")}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDesignDialog
        design={design}
        open={dialog === "rename"}
        onOpenChange={(open) => setDialog(open ? "rename" : null)}
      />
      <DeleteDesignDialog
        design={design}
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
      />
    </li>
  );
}
