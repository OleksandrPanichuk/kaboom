import { DesignWorkspace } from "@/features/designs/ui/components";
import { backFrom } from "@/features/designs/utils";

interface DesignViewProps {
  designId: string;
  draftId: string | null;
  from: string | null;
}

export function DesignView({ designId, draftId, from }: DesignViewProps) {
  return (
    <DesignWorkspace
      designId={designId}
      back={
        backFrom(from) ??
        (draftId
          ? {
              to: "/authoring/$draftId",
              params: { draftId },
              label: "Problem draft",
            }
          : { to: "/designs", label: "Designs" })
      }
    />
  );
}
