import { Network } from "lucide-react";

export function CanvasPlaceholder() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-zinc-50 bg-[radial-gradient(circle,rgba(24,24,27,0.12)_1px,transparent_1px)] bg-[size:20px_20px] p-6">
      <div className="flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-black/[0.07] bg-white/90 p-6 text-center shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] backdrop-blur">
        <span className="grid size-11 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50 text-indigo-700">
          <Network aria-hidden="true" className="size-5" />
        </span>
        <p className="font-semibold tracking-[-0.02em]">
          The canvas is on its way
        </p>
        <p className="text-sm leading-5 text-muted-foreground text-pretty">
          Soon you will place services, databases and queues here and connect
          them.
        </p>
      </div>
    </div>
  );
}
