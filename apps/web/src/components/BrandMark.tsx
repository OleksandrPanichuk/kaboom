import { cn } from "cn";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid size-8 shrink-0 place-items-center rounded-xl bg-zinc-950 shadow-sm shadow-zinc-950/20",
        className,
      )}
    >
      <span className="size-2.5 rotate-45 rounded-[3px] border-2 border-white" />
    </span>
  );
}
