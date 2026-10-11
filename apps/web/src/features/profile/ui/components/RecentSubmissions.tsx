import type { PublicProfileModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";

interface RecentSubmissionsProps {
  recent: PublicProfileModel["recent"];
}

const day = (at: string) =>
  new Date(at).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function RecentSubmissions({ recent }: RecentSubmissionsProps) {
  if (recent.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No challenges solved yet.</p>
    );
  }

  return (
    <ul className="flex flex-col divide-y">
      {recent.map((submission, index) => (
        <li
          key={`${submission.problem.slug}-${submission.at}-${index}`}
          className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <Link
            to="/problems/$slug"
            params={{ slug: submission.problem.slug }}
            className="min-w-0 truncate text-sm font-medium hover:underline"
          >
            {submission.problem.title}
          </Link>
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {submission.score} · {day(submission.at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
