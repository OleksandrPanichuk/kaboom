import { Skeleton } from "@/components/ui/Skeleton";

const PLACEHOLDERS = ["a", "b", "c", "d", "e", "f"];

export function DesignsGridSkeleton() {
  return (
    <ul aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PLACEHOLDERS.map((key) => (
        <li
          key={key}
          className="flex items-start gap-3 rounded-2xl border border-black/[0.07] bg-white p-4"
        >
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
