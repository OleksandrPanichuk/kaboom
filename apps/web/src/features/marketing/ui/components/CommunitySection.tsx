import { GitFork, Lock, Users } from "lucide-react";

import { AUTHORING_STEPS } from "@/features/marketing/constants";

import { SectionHeading } from "./SectionHeading";

export function CommunitySection() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Community"
        title="Write the problem you wish you had been asked"
        body="Anyone with a verified email can author a problem. It goes through the same checks as the official ones, and a moderator publishes it."
      />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AUTHORING_STEPS.map((step, index) => (
          <li
            key={step.title}
            data-reveal
            className="relative flex flex-col gap-3 rounded-3xl border border-border/80 bg-card/60 p-6"
          >
            <span className="font-mono text-sm text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
      <div data-reveal className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: GitFork,
            title: "Fork anything",
            body: "Start from a published problem and make it yours. The original is credited.",
          },
          {
            icon: Lock,
            title: "Solutions you earn",
            body: "Solve a problem to unlock the best anonymous designs of everyone else who did.",
          },
          {
            icon: Users,
            title: "Points for authors",
            body: "Your problems count on the leaderboard for everyone who solves them.",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex gap-3 rounded-2xl border border-border/60 p-4"
            >
              <Icon
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-primary"
              />
              <div className="flex flex-col gap-1">
                <span className="font-medium">{item.title}</span>
                <span className="text-sm text-muted-foreground">
                  {item.body}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
