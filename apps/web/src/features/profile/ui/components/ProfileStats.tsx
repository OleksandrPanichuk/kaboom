import type { PublicProfileModel } from "@repo/api-client";

interface ProfileStatsProps {
  standing: PublicProfileModel["standing"];
}

export function ProfileStats({ standing }: ProfileStatsProps) {
  const stats = [
    { label: "Rank", value: standing.rank },
    { label: "Points", value: standing.points.toLocaleString("en") },
    { label: "Solved", value: standing.solved.toLocaleString("en") },
    {
      label: "Place",
      value: standing.position === null ? "—" : `#${standing.position}`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-4 py-3"
        >
          <dt className="text-xs text-muted-foreground">{stat.label}</dt>
          <dd className="truncate text-lg font-semibold tabular-nums">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
