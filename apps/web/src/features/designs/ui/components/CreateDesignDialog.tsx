import type { DesignModel } from "@repo/api-client";
import { useMutation } from "@tanstack/react-query";

import { createDesignMutation } from "@/features/designs/api";

import { DesignNameDialog } from "./DesignNameDialog";

interface CreateDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (design: DesignModel) => void;
}

export function CreateDesignDialog({
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
      title="New design"
      description="Name the system you are about to design. You can change it later."
      submitLabel="Create design"
      pendingLabel="Creating…"
      defaultName=""
      pending={create.isPending}
      error={create.error}
      onSubmit={(name) => create.mutate({ name }, { onSuccess: onCreated })}
    />
  );
}
