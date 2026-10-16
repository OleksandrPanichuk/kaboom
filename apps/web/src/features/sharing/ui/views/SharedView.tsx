import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight, Link2Off } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { currentUserQuery } from "@/features/auth";
import { UserAvatar } from "@/features/profile";
import { sharedQuery } from "@/features/sharing/api";
import { SharedCanvas, SharedReview } from "@/features/sharing/ui/components";

interface SharedViewProps {
  token: string;
}

const DATE = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function SharedView({ token }: SharedViewProps) {
  const shared = useQuery(sharedQuery(token));
  const user = useQuery(currentUserQuery);

  if (shared.isPending) {
    return (
      <p role="status" className="px-4 py-24 text-center text-muted-foreground">
        Loading…
      </p>
    );
  }

  if (shared.isError) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <Link2Off aria-hidden="true" className="size-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          This link no longer works
        </h1>
        <p className="text-muted-foreground text-pretty">
          The person who shared it turned it off, or what it pointed to is gone.
        </p>
        <Link to="/" className={buttonVariants({ variant: "outline" })}>
          See what Kaboom is
        </Link>
      </main>
    );
  }

  const { data } = shared;
  const eyebrow = data.interview
    ? "Mock interview review"
    : data.kind === "schema"
      ? "Shared data model"
      : "Shared system design";

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          {data.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {data.owner ? (
            <span className="flex items-center gap-2">
              <UserAvatar
                name={data.owner.displayName}
                url={data.owner.avatarUrl}
                size="sm"
              />
              <span className="text-foreground">{data.owner.displayName}</span>
            </span>
          ) : null}
          <span>Shared {DATE.format(new Date(data.sharedAt))}</span>
          {data.interview ? (
            <span className="capitalize">
              {data.interview.problem.difficulty}
            </span>
          ) : null}
        </div>
      </header>
      <SharedCanvas graph={data.graph} layout={data.layout} />
      {data.interview ? <SharedReview interview={data.interview} /> : null}
      <section className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">
            Design it, then watch it take load
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Kaboom simulates traffic, injects failures and reviews your mock
            interviews.
          </p>
        </div>
        <Link
          to={user.data ? "/home" : "/sign-up"}
          className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
        >
          {user.data ? "Open the app" : "Start practising free"}
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </section>
    </main>
  );
}
