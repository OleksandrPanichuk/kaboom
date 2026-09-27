import type { DrillResultModel } from "@repo/api-client";
import { CircleCheck, CircleX, EyeOff } from "lucide-react";

interface DrillResultsProps {
  drills: DrillResultModel[];
}

export function DrillResults({ drills }: DrillResultsProps) {
  return (
    <ul className="flex flex-col gap-2">
      {drills.map((drill) => (
        <li
          key={drill.id}
          className="flex min-w-0 gap-2.5 rounded-xl border border-black/[0.07] bg-white p-3"
        >
          {drill.passed ? (
            <CircleCheck
              aria-label="Passed"
              className="mt-0.5 size-4 shrink-0 text-emerald-600"
            />
          ) : (
            <CircleX
              aria-label="Failed"
              className="mt-0.5 size-4 shrink-0 text-red-600"
            />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              {drill.visibility === "hidden" ? (
                <EyeOff
                  aria-label="Hidden drill"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              ) : null}
              {drill.title}
            </p>
            {drill.failures.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm leading-5 text-muted-foreground">
                {drill.failures.map((failure) => (
                  <li key={failure} className="text-pretty">
                    {failure}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
