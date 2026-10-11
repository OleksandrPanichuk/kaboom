import { Skeleton } from "@/components/ui/Skeleton";

const PLACEHOLDERS = ["a", "b", "c", "d", "e", "f"];

export function ProblemsListSkeleton() {
  return (
    <ul
      aria-hidden="true"
      className="divide-y divide-border rounded-2xl border border-border bg-card"
    >
      {PLACEHOLDERS.map((key) => (
        <li key={key} className="flex flex-col gap-2 px-4 py-4 sm:px-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3.5 w-2/3" />
        </li>
      ))}
    </ul>
  );
}
