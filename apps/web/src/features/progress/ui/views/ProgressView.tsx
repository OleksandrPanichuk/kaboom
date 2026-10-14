import {
  ActivityList,
  ProblemsTable,
  ProgressSummary,
  SkillTrends,
} from "@/features/progress/ui/components";

export function ProgressView() {
  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">
            Progress
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base text-pretty">
            How your interviews and challenges have gone, and how each skill has
            moved.
          </p>
        </div>
        <ProgressSummary />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <SkillTrends />
            <ProblemsTable />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <ActivityList />
          </div>
        </div>
      </div>
    </div>
  );
}
