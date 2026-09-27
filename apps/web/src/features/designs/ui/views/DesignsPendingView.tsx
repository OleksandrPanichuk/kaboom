import {
  DesignsGridSkeleton,
  DesignsPage,
} from "@/features/designs/ui/components";

export function DesignsPendingView() {
  return (
    <DesignsPage>
      <p role="status" className="sr-only">
        Loading your designs…
      </p>
      <DesignsGridSkeleton />
    </DesignsPage>
  );
}
