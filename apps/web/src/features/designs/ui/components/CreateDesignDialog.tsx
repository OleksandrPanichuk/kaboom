import type { DesignModel } from "@repo/api-client";
import { useMutation } from "@tanstack/react-query";

import { createDesignMutation } from "@/features/designs/api";

import { DesignNameDialog } from "./DesignNameDialog";

interface CreateDesignDialogProps {
  kind: "system" | "schema";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (design: DesignModel) => void;
}

const COPY = {
  system: {
    title: "New design",
    description:
      "Name the system you are about to design. You can change it later.",
    submit: "Create design",
  },
  schema: {
    title: "New schema",
    description:
      "A schema holds databases and their tables, collections or DynamoDB tables. A database in any of your systems can name it.",
    submit: "Create schema",
  },
} as const;

export function CreateDesignDialog({
  kind,
  open,
  onOpenChange,
  onCreated,
}: CreateDesignDialogProps) {
  const create = useMutation(createDesignMutation);

  const changeOpen = (next: boolean) => {
    if (!next) create.reset();
    onOpenChange(next);
  };

  return (
    <DesignNameDialog
      open={open}
      onOpenChange={changeOpen}
      title={COPY[kind].title}
      description={COPY[kind].description}
      submitLabel={COPY[kind].submit}
      pendingLabel="Creating…"
      defaultName=""
      pending={create.isPending}
      error={create.error}
      onSubmit={(name) =>
        create.mutate({ name, kind }, { onSuccess: onCreated })
      }
    />
  );
}
