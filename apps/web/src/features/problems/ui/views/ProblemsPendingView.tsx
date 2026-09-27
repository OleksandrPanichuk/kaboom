import {
  ProblemsListSkeleton,
  ProblemsPage,
} from "@/features/problems/ui/components";

export function ProblemsPendingView() {
  return (
    <ProblemsPage>
      <p role="status" className="sr-only">
        Loading problems…
      </p>
      <ProblemsListSkeleton />
    </ProblemsPage>
  );
}
