import { type DesignGraph, toDDL, toMongo } from "@repo/design";
import { Check, FileCode2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

const SHOWN_MS = 2_000;

interface CopySqlButtonProps {
  graph: DesignGraph;
  format?: "sql" | "mongo";
  className?: string;
}

export function CopySqlButton({
  graph,
  format = "sql",
  className,
}: CopySqlButtonProps) {
  const [copied, setCopied] = useState(false);
  const mongo = format === "mongo";
  const what = mongo ? "for MongoDB" : "as SQL";

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
        copied ? `Copied the schema ${what}` : `Copy the schema ${what}`
      }
      title={
        mongo
          ? "Copy each collection's validator and indexes as mongosh commands"
          : "Copy the tables, foreign keys and indexes as each engine's DDL"
      }
      onClick={() =>
        void navigator.clipboard
          .writeText(mongo ? toMongo(graph) : toDDL(graph))
          .then(() => setCopied(true))
      }
    >
      {copied ? <Check aria-hidden="true" /> : <FileCode2 aria-hidden="true" />}
      <span className="hidden sm:inline">
        {copied ? "Copied" : mongo ? "Copy for MongoDB" : "Copy SQL"}
      </span>
    </Button>
  );
}
