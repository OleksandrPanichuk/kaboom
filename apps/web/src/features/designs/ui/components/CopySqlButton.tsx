import { type DesignGraph, toDDL } from "@repo/design";
import { Check, FileCode2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

const SHOWN_MS = 2_000;

interface CopySqlButtonProps {
  graph: DesignGraph;
  className?: string;
}

export function CopySqlButton({ graph, className }: CopySqlButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), SHOWN_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      aria-label={
        copied ? "Copied the schema as SQL" : "Copy the schema as SQL"
      }
      title="Copy the tables, foreign keys and indexes as Postgres DDL"
      onClick={() =>
        void navigator.clipboard
          .writeText(toDDL(graph))
          .then(() => setCopied(true))
      }
    >
      {copied ? <Check aria-hidden="true" /> : <FileCode2 aria-hidden="true" />}
      <span className="hidden sm:inline">{copied ? "Copied" : "Copy SQL"}</span>
    </Button>
  );
}
