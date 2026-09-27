import type { WorkspaceTool } from "@/features/shell/typedefs";

interface WorkspaceToolPanelProps {
  tool: WorkspaceTool;
}

export function WorkspaceToolPanel({ tool }: WorkspaceToolPanelProps) {
  return (
    <section aria-label={tool.label} className="flex h-full min-h-0 flex-col">
      <h2 className="flex h-10 shrink-0 items-center border-b px-4 text-sm font-medium">
        {tool.label}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto">{tool.content}</div>
    </section>
  );
}
