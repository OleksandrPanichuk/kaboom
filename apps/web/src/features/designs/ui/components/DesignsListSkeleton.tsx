import { Skeleton } from "@/components/ui/Skeleton";

const PLACEHOLDERS = ["a", "b", "c", "d", "e", "f"];

export function DesignsListSkeleton() {
  return (
    <ul
      aria-hidden="true"
      className="divide-y divide-border rounded-2xl border border-border bg-card"
    >
      {PLACEHOLDERS.map((key) => (
        <li key={key} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/5 lg:hidden" />
          </div>
        </li>
      ))}
    </ul>
  );
}
