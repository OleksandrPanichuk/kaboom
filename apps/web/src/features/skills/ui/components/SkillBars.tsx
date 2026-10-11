import { cn } from "cn";

interface SkillBar {
  skill: string;
  label: string;
  score: number | null;
  samples: number;
}

interface SkillBarsProps {
  skills: readonly SkillBar[];
}

const barTone = (score: number) =>
  score >= 80
    ? "bg-emerald-500"
    : score >= 50
      ? "bg-indigo-500"
      : "bg-amber-500";

export function SkillBars({ skills }: SkillBarsProps) {
  return (
    <ul className="flex flex-col gap-3">
      {skills.map((skill) => (
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
  );
}
