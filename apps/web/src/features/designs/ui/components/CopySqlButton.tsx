import {
  type DesignGraph,
  toCloudFormation,
  toDDL,
  toMongo,
} from "@repo/design";
import { Check, FileCode2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

const SHOWN_MS = 2_000;

const FORMATS = {
  sql: {
    what: "as SQL",
    label: "Copy SQL",
    title: "Copy the tables, foreign keys and indexes as each engine's DDL",
    write: toDDL,
  },
  mongo: {
    what: "for MongoDB",
    label: "Copy for MongoDB",
    title: "Copy each collection's validator and indexes as mongosh commands",
    write: toMongo,
  },
  cloudformation: {
    what: "as CloudFormation",
    label: "Copy CloudFormation",
    title:
      "Copy each DynamoDB table, its keys and indexes as a CloudFormation template",
    write: toCloudFormation,
  },
} as const;

interface CopySqlButtonProps {
  graph: DesignGraph;
  format?: keyof typeof FORMATS;
  className?: string;
}

export function CopySqlButton({
  graph,
  format = "sql",
  className,
}: CopySqlButtonProps) {
  const [copied, setCopied] = useState(false);
  const { what, label, title, write } = FORMATS[format];

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
      title={title}
      onClick={() =>
        void navigator.clipboard
          .writeText(write(graph))
          .then(() => setCopied(true))
      }
    >
      {copied ? <Check aria-hidden="true" /> : <FileCode2 aria-hidden="true" />}
      <span className="hidden sm:inline">{copied ? "Copied" : label}</span>
    </Button>
  );
}
