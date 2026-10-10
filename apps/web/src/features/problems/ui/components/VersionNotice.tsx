import { RefreshCw } from "lucide-react";
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

interface VersionNoticeProps {
  version: number;
  latestVersion: number;
  pending: boolean;
  error: string | null;
  onUpgrade: () => void;
}

export function VersionNotice({
  version,
  latestVersion,
  pending,
  error,
  onUpgrade,
}: VersionNoticeProps) {
  const [asking, setAsking] = useState(false);

  return (
    <div className="flex flex-col gap-2.5 border-b bg-sky-50 px-4 py-3 text-sm leading-5 text-sky-950">
      <div className="flex gap-2.5">
        <RefreshCw
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-sky-600"
        />
        <p className="text-pretty">
          This problem has changed since you started it. You are on version{" "}
          {version}, and that is what is shown here and what your runs and
          submissions are scored against.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="self-start bg-white"
        disabled={pending}
        onClick={() => setAsking(true)}
      >
        {pending ? "Moving…" : `Move to version ${latestVersion}`}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}

      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move to version {latestVersion}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your design stays as it is. From your next run, the new brief,
              tests and rubric apply, and the hints you have revealed carry
              over. Submissions you have already made keep the scores they got.
              You cannot move back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on version {version}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onUpgrade();
                setAsking(false);
              }}
            >
              Move to version {latestVersion}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
