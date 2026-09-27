import { Flag } from "lucide-react";
import { useState } from "react";

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
import { Button } from "@/components/ui/Button";

interface EndInterviewButtonProps {
  disabled: boolean;
  onEnd: () => void;
}

export function EndInterviewButton({
  disabled,
  onEnd,
}: EndInterviewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-label="End interview"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Flag aria-hidden="true" />
        <span className="hidden sm:inline">End interview</span>
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End the interview?</AlertDialogTitle>
            <AlertDialogDescription>
              Your design is locked as it is now and goes to review. You cannot
              change it or talk to the interviewer afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpen(false);
                onEnd();
              }}
            >
              End interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
