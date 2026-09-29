import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Gauge } from "lucide-react";

import { skillsQuery } from "@/features/skills/api";

const barTone = (score: number) =>
  score >= 80
    ? "bg-emerald-500"
    : score >= 50
      ? "bg-indigo-500"
      : "bg-amber-500";

export function SkillsCard() {
  const { data } = useSuspenseQuery(skillsQuery);
  const reviewed = data.skills.some((skill) => skill.score !== null);

  return (
    <section
      aria-labelledby="skills-title"
      className="flex flex-col gap-4 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-indigo-200/60 bg-indigo-50 text-indigo-700">
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
      <ul className="flex flex-col gap-3">
        {data.skills.map((skill) => (
          <li key={skill.skill} className="flex flex-col gap-1.5">
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{skill.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {skill.score === null
                  ? "No data yet"
                  : `${skill.score} · ${skill.samples} ${skill.samples === 1 ? "review" : "reviews"}`}
              </span>
            </p>
            <div
              role="progressbar"
              aria-label={skill.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={skill.score ?? undefined}
              className="h-1.5 overflow-hidden rounded-full bg-zinc-100"
            >
              {skill.score !== null ? (
                <div
                  className={cn("h-full rounded-full", barTone(skill.score))}
                  style={{ width: `${Math.max(2, skill.score)}%` }}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
