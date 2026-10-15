import { cn } from "cn";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  body?: string;
  centered?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false,
}: SectionHeadingProps) {
  return (
    <div
      data-reveal
      className={cn(
        "flex max-w-2xl flex-col gap-3",
        centered && "mx-auto items-center text-center",
      )}
    >
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
        {title}
      </h2>
      {body ? (
        <p className="text-base leading-7 text-muted-foreground text-pretty sm:text-lg">
          {body}
        </p>
      ) : null}
    </div>
  );
}
