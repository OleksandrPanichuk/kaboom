import type { DesignSummaryModel } from "@repo/api-client";
import { useMutation } from "@tanstack/react-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { errorMessage } from "@/features/auth";
import { deleteDesignMutation } from "@/features/designs/api";

interface DeleteDesignDialogProps {
  design: DesignSummaryModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDesignDialog({
  design,
  open,
  onOpenChange,
}: DeleteDesignDialogProps) {
  const remove = useMutation(deleteDesignMutation);

  const changeOpen = (next: boolean) => {
    if (!next) remove.reset();
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this design?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium break-words text-foreground">
              {design.name}
            </span>{" "}
            and its whole history will be deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(remove.error)}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(
                { id: design.id },
                { onSuccess: () => changeOpen(false) },
              )
            }
          >
            {remove.isPending ? "Deleting…" : "Delete design"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
