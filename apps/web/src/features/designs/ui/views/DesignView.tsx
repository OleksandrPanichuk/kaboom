import { DesignWorkspace } from "@/features/designs/ui/components";

interface DesignViewProps {
  designId: string;
}

export function DesignView({ designId }: DesignViewProps) {
  return (
    <DesignWorkspace
      designId={designId}
      back={{ to: "/designs", label: "Designs" }}
    />
  );
}
