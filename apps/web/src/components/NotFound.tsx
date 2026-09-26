import { Link } from "@tanstack/react-router";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/Button";

export function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-[0.12em] text-indigo-700 uppercase">
          404
        </p>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-[-0.03em]">
            There's nothing here
          </h1>
          <p className="text-sm leading-6 text-muted-foreground text-pretty">
            The link may be old, or the page may have moved.
          </p>
        </div>
        <Link to="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Go home
        </Link>
      </div>
    </div>
  );
}
