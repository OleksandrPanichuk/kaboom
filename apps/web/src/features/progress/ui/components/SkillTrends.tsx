import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { skillHistoryQuery } from "@/features/progress/api";
import { skillTrends } from "@/features/progress/utils";
import { skillsQuery } from "@/features/skills";

import { SkillSparkline } from "./SkillSparkline";

const CARD =
  "rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)]";

export function SkillTrends() {
  const { data: history } = useSuspenseQuery(skillHistoryQuery);
  const { data: skills } = useSuspenseQuery(skillsQuery);
  const order = skills.skills.map((skill) => skill.skill);
  const trends = skillTrends(history.points, history.halfLifeDays).sort(
    (a, b) => order.indexOf(a.skill) - order.indexOf(b.skill),
  );
  const labels = new Map(
    skills.skills.map((skill) => [skill.skill, skill.label]),
  );
  const today = new Map(
    skills.skills.map((skill) => [skill.skill, skill.score]),
  );
  const untouched = skills.skills.filter(
    (skill) => !trends.some((trend) => trend.skill === skill.skill),
  );

  return (
    <section aria-labelledby="skills-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2
          id="skills-title"
          className="text-lg font-semibold tracking-[-0.02em]"
        >
          Skills over time
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Each skill is the weighted average of every review that scored it. The
          line shows that average after each one.
        </p>
      </div>
      {trends.length === 0 ? (
        <p className={cn(CARD, "text-sm text-muted-foreground")}>
          Finish an interview or submit a challenge to start the record.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trends.map((trend) => {
            const label = labels.get(trend.skill) ?? trend.skill;
            const Icon =
              trend.change === null || trend.change === 0
                ? Minus
                : trend.change > 0
                  ? TrendingUp
                  : TrendingDown;

            return (
              <li key={trend.skill} className={cn(CARD, "flex flex-col gap-3")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-3xl font-semibold tracking-[-0.04em]">
                      {today.get(trend.skill) ?? trend.current}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
                      trend.change === null || trend.change === 0
                        ? "bg-zinc-100 text-zinc-600"
                        : trend.change > 0
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-red-50 text-red-800",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                    {trend.change === null
                      ? "First review"
                      : `${trend.change > 0 ? "+" : ""}${trend.change} since the last`}
                  </p>
                </div>
                <SkillSparkline label={label} points={trend.points} />
              </li>
            );
          })}
        </ul>
      )}
      {trends.length > 0 && untouched.length > 0 ? (
        <p className="text-sm text-muted-foreground text-pretty">
          Not practised yet: {untouched.map((skill) => skill.label).join(", ")}.
        </p>
      ) : null}
      {trends.length > 0 ? (
        <details className="group text-sm">
          <summary className="w-fit cursor-pointer rounded font-medium text-indigo-700 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50">
            Show as a table
          </summary>
          <div className="mt-2 overflow-x-auto rounded-xl border border-black/[0.07] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Skill</th>
                  <th className="px-3 py-2 font-medium">Review</th>
                  <th className="px-3 py-2 text-right font-medium">Earned</th>
                  <th className="px-3 py-2 text-right font-medium">Average</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {trends.flatMap((trend) =>
                  trend.points.map((point, index) => (
                    <tr key={`${trend.skill}-${index}`} className="border-t">
                      <td className="px-3 py-2">
                        {labels.get(trend.skill) ?? trend.skill}
                      </td>
                      <td className="px-3 py-2">
                        {point.problem},{" "}
                        {new Date(point.at).toLocaleDateString("en", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">{point.earned}</td>
                      <td className="px-3 py-2 text-right">{point.value}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}
