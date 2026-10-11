import { useMutation } from "@tanstack/react-query";
import { GitFork } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import { createDraftMutation } from "@/features/authoring/api";

interface ForkProblemButtonProps {
  slug: string;
  onForked: (draftId: string) => void;
  size?: "sm" | "default";
}

export function ForkProblemButton({
  slug,
  onForked,
  size = "default",
}: ForkProblemButtonProps) {
  const fork = useMutation(createDraftMutation);

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="outline"
        size={size}
        disabled={fork.isPending}
        onClick={() =>
          fork.mutate(slug, { onSuccess: (draft) => onForked(draft.id) })
        }
      >
        <GitFork aria-hidden="true" />
        {fork.isPending ? "Forking…" : "Fork"}
      </Button>
      {fork.error ? (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage(fork.error)}
        </p>
      ) : null}
    </div>
  );
}
