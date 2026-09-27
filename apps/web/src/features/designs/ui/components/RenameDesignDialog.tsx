import type { DesignSummaryModel } from "@repo/api-client";
import { useMutation } from "@tanstack/react-query";

import { renameDesignMutation } from "@/features/designs/api";

import { DesignNameDialog } from "./DesignNameDialog";

interface RenameDesignDialogProps {
  design: DesignSummaryModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameDesignDialog({
  design,
  open,
  onOpenChange,
}: RenameDesignDialogProps) {
  const rename = useMutation(renameDesignMutation);

  const changeOpen = (next: boolean) => {
    if (!next) rename.reset();
    onOpenChange(next);
  };

  return (
    <DesignNameDialog
      open={open}
      onOpenChange={changeOpen}
      title="Rename design"
      description="The new name shows everywhere this design appears."
      submitLabel="Save"
      pendingLabel="Saving…"
      defaultName={design.name}
      pending={rename.isPending}
      error={rename.error}
      onSubmit={(name) => {
        if (name === design.name) {
          changeOpen(false);

          return;
        }

        rename.mutate(
          { id: design.id, name },
          { onSuccess: () => changeOpen(false) },
        );
      }}
    />
  );
}
