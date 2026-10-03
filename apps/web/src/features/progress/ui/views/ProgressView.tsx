import {
  ActivityList,
  ProblemsTable,
  ProgressSummary,
  SkillTrends,
} from "@/features/progress/ui/components";

export function ProgressView() {
  return (
    <div className="flex-1 bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">
            Progress
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base text-pretty">
            How your interviews and challenges have gone, and how each skill has
            moved.
          </p>
        </div>
        <ProgressSummary />
        <SkillTrends />
        <div className="grid gap-8 lg:grid-cols-2">
          <ActivityList />
          <ProblemsTable />
        </div>
      </div>
    </div>
  );
}
