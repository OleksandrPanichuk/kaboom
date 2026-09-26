import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { RotateCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ApiRequestError } from "@/lib/api";

const isUnreachable = (error: unknown): boolean =>
  !navigator.onLine ||
  error instanceof TypeError ||
  (error instanceof ApiRequestError && error.status >= 502);

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const unreachable = isUnreachable(error);

  const retry = () => {
    reset();
    void router.invalidate();
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div
        role="alert"
        className="flex max-w-sm flex-col items-center gap-4 text-center"
      >
        <span className="grid size-11 place-items-center rounded-2xl border bg-muted text-muted-foreground">
          <WifiOff aria-hidden="true" className="size-5" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-[-0.03em]">
            {unreachable ? "Kaboom can't be reached" : "This page didn't load"}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground text-pretty">
            {unreachable
              ? "Check your connection. Your work is saved on the server and will be here when you're back."
              : "Something went wrong on our side. Try again, and if it keeps happening, reload the page."}
          </p>
        </div>
        <Button onClick={retry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    </div>
  );
}
