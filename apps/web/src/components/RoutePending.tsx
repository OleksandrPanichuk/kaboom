import { LoaderCircle } from "lucide-react";

export function RoutePending() {
  return (
    <div
      role="status"
      className="flex flex-1 items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-4 animate-spin motion-reduce:animate-none"
      />
      Loading…
    </div>
  );
}
