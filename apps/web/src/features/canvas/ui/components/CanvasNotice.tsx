import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface CanvasNoticeProps {
  message: string;
  onDismiss: () => void;
}

export function CanvasNotice({ message, onDismiss }: CanvasNoticeProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
      <div
        role="alert"
        className="pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border border-destructive/20 bg-white py-2 pr-1.5 pl-3 text-sm shadow-[0_12px_36px_-24px_rgba(24,24,27,0.5)]"
      >
        <p className="min-w-0 flex-1 py-0.5 text-destructive">{message}</p>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
