import { MousePointerClick } from "lucide-react";

export function InspectorEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="grid size-9 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
        <MousePointerClick aria-hidden="true" className="size-4" />
      </span>
      <p className="text-sm font-medium">Nothing selected</p>
      <p className="text-sm leading-5 text-muted-foreground text-pretty">
        Select a node on the canvas to edit its properties here.
      </p>
    </div>
  );
}
