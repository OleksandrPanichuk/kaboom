import { FACTS, STEPS } from "@/features/marketing/constants";

export function StepsSection() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6">
      <div data-reveal className="flex max-w-2xl flex-col gap-3">
        <p className="text-sm font-medium text-primary">How it works</p>
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          Draw it. Run it. Find out.
        </h2>
      </div>
      <ol data-steps className="relative grid gap-8 md:grid-cols-3 md:gap-6">
        <div
          aria-hidden="true"
          className="absolute top-5 right-[16%] left-[16%] hidden h-px bg-border md:block"
        >
          <div
            data-steps-progress
            className="h-full w-full origin-left bg-primary"
          />
        </div>
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            data-reveal
            className="relative flex flex-col gap-3 md:items-center md:text-center"
          >
            <span className="relative z-10 grid size-10 place-items-center rounded-full border border-primary/40 bg-background font-mono text-sm font-semibold text-primary shadow-[0_0_24px_-4px_var(--primary)]">
              {index + 1}
            </span>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground text-pretty">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
      <dl className="grid gap-px overflow-hidden rounded-3xl border border-border/80 bg-border/80 sm:grid-cols-3">
        {FACTS.map((fact) => (
          <div
            key={fact.label}
            data-reveal
            className="flex flex-col gap-1 bg-background p-6 sm:p-8"
          >
            <dt className="order-2 text-sm leading-6 text-muted-foreground">
              {fact.label}
            </dt>
            <dd
              data-count={/^\d+$/.test(fact.value) ? fact.value : undefined}
              className="order-1 bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-5xl font-semibold tracking-[-0.05em] text-transparent tabular-nums"
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
