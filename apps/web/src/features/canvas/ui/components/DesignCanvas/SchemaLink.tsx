import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUpRight, Sheet, TriangleAlert } from "lucide-react";

import type { CanvasSchema } from "@/features/canvas/typedefs";

interface SchemaLinkProps {
  schema: CanvasSchema;
}

const ROW =
  "flex items-center gap-1.5 border-t border-border px-2.5 py-1.5 text-xs";

export function SchemaLink({ schema }: SchemaLinkProps) {
  const { pathname } = useLocation();

  if (schema.name === null) {
    return (
      <p className={`${ROW} text-warning-foreground`}>
        <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">Its schema is gone</span>
      </p>
    );
  }

  const name = schema.name ?? "Schema";

  return (
    <Link
      to="/designs/$designId"
      params={{ designId: schema.designId }}
      search={{ from: pathname }}
      title={`Open the schema ${name}`}
      aria-label={`Open the schema ${name}`}
      className={`${ROW} nodrag nopan group/schema rounded-b-xl font-medium text-interactive-foreground hover:bg-interactive-surface`}
    >
      <Sheet aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="line-clamp-2 min-w-0 flex-1 break-words">{name}</span>
      <ArrowUpRight
        aria-hidden="true"
        className="size-3.5 shrink-0 opacity-60 group-hover/schema:opacity-100"
      />
    </Link>
  );
}
