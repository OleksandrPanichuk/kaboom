import { cn } from "cn";

const LINES: ReadonlyArray<ReadonlyArray<{ word: string; accent?: boolean }>> =
  [
    [{ word: "Design" }, { word: "systems" }],
    [{ word: "that" }, { word: "survive", accent: true }],
    [
      { word: "the", accent: true },
      { word: "traffic", accent: true },
    ],
  ];

export function HeroHeadline() {
  return (
    <h1
      aria-label="Design systems that survive the traffic"
      className="text-5xl leading-[1.02] font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl"
    >
      {LINES.map((line, index) => (
        <span key={index} aria-hidden="true" className="block">
          {line.map(({ word, accent }) => (
            <span
              key={word}
              className="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-bottom last:mr-0"
            >
              <span
                data-word
                className={cn(
                  "inline-block",
                  accent &&
                    "bg-gradient-to-r from-primary via-primary to-warning-foreground bg-clip-text text-transparent",
                )}
              >
                {word}
              </span>
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
