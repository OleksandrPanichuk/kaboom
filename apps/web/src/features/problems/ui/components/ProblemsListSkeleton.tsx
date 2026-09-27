import { Skeleton } from "@/components/ui/Skeleton";

const PLACEHOLDERS = ["a", "b", "c", "d"];

export function ProblemsListSkeleton() {
  return (
    <ul aria-hidden="true" className="grid gap-3 md:grid-cols-2">
      {PLACEHOLDERS.map((key) => (
        <li
          key={key}
          className="flex flex-col gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-5"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-1/3" />
        </li>
      ))}
    </ul>
  );
}
