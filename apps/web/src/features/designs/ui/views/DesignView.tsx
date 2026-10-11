import { DesignWorkspace } from "@/features/designs/ui/components";

interface DesignViewProps {
  designId: string;
  draftId: string | null;
}

export function DesignView({ designId, draftId }: DesignViewProps) {
  return (
    <DesignWorkspace
      designId={designId}
      back={
        draftId
          ? {
              to: "/authoring/$draftId",
              params: { draftId },
              label: "Problem draft",
            }
          : { to: "/designs", label: "Designs" }
      }
    />
  );
}
