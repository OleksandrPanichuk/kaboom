import { useSuspenseQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";

import { skillsQuery } from "@/features/skills/api";

import { SkillBars } from "./SkillBars";

export function SkillsCard() {
  const { data } = useSuspenseQuery(skillsQuery);
  const scored = data.skills.filter((skill) => skill.score !== null);
  const unscored = data.skills.filter((skill) => skill.score === null);
  const reviewed = scored.length > 0;

  return (
    <section
      aria-labelledby="skills-title"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-interactive-border/60 bg-interactive-surface text-interactive-foreground">
          <Gauge aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 id="skills-title" className="font-semibold">
            Skills
          </h2>
          <p className="text-xs text-muted-foreground text-pretty">
            {reviewed
              ? "From every reviewed interview and challenge."
              : "Finish an interview to see where you stand."}
          </p>
        </div>
      </div>
      {reviewed ? <SkillBars skills={scored} /> : null}
      {unscored.length > 0 && reviewed ? (
        <p className="text-xs text-muted-foreground text-pretty">
          Not scored yet:{" "}
          {unscored.map((skill) => skill.label.toLowerCase()).join(", ")}.
        </p>
      ) : null}
    </section>
  );
}
