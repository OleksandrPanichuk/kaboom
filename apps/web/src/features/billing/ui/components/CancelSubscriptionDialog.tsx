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
import { cancelSubscriptionMutation } from "@/features/billing/api";
import { billingErrorMessage } from "@/features/billing/utils";

interface CancelSubscriptionDialogProps {
  endsOn: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelSubscriptionDialog({
  endsOn,
  open,
  onOpenChange,
}: CancelSubscriptionDialogProps) {
  const cancel = useMutation(cancelSubscriptionMutation);

  const changeOpen = (next: boolean) => {
    if (!next) cancel.reset();
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            {endsOn
              ? `You keep Pro until ${endsOn}, and nothing more is charged. You can keep the subscription any time before then.`
              : "Nothing more is charged. You can keep the subscription any time before the period ends."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {cancel.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {billingErrorMessage(cancel.error)}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Pro</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate(undefined, { onSuccess: () => changeOpen(false) })
            }
          >
            {cancel.isPending ? "Cancelling…" : "Cancel subscription"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
