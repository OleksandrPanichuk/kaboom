import { Database, Network, Rocket } from "lucide-react";

import { TRACKS } from "@/features/marketing/constants";

const ICONS = {
  "system-design": Network,
  devops: Rocket,
  "data-model": Database,
};

export function TracksSection() {
  return (
    <section
      id="tracks"
      className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-10 px-4 py-20 sm:px-6"
    >
      <div data-reveal className="flex max-w-2xl flex-col gap-3">
        <p className="text-sm font-medium text-primary">Three tracks</p>
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          From the load balancer to the last index
        </h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {TRACKS.map((track) => {
          const Icon = ICONS[track.key];

          return (
            <article
              key={track.key}
              data-reveal
              className="flex flex-col gap-5 rounded-3xl border border-border/80 bg-gradient-to-b from-card/80 to-card/20 p-6"
            >
              <span className="grid size-11 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold tracking-[-0.02em]">
                  {track.title}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {track.blurb}
                </p>
              </div>
              <ul className="mt-auto flex flex-col divide-y divide-border/70 border-t border-border/70 text-sm">
                {track.problems.map((problem) => (
                  <li
                    key={problem}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span>{problem}</span>
                    <span aria-hidden="true" className="text-muted-foreground">
                      →
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
