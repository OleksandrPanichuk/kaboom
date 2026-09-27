import type { DesignSummaryModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { Ellipsis, Network, Pencil, Trash2 } from "lucide-react";
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

interface DesignCardProps {
  design: DesignSummaryModel;
}

type OpenDialog = "rename" | "delete" | null;

export function DesignCard({ design }: DesignCardProps) {
  const [dialog, setDialog] = useState<OpenDialog>(null);

  return (
    <li className="group relative flex min-w-0 items-start gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] transition-colors hover:border-indigo-200 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/50">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-indigo-200/60 bg-indigo-50 text-indigo-700">
        <Network aria-hidden="true" className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
        <Link
          to="/designs/$designId"
          params={{ designId: design.id }}
          className="truncate font-semibold tracking-[-0.02em] outline-none after:absolute after:inset-0 after:rounded-2xl"
        >
          {design.name}
        </Link>
        <p className="truncate text-sm text-muted-foreground">
          <time dateTime={design.updatedAt}>
            {formatEditedAt(design.updatedAt)}
          </time>
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative z-[1] -mt-1 -mr-1 shrink-0 text-muted-foreground"
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
