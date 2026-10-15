import { Plus } from "lucide-react";

import { LANDING_QUESTIONS } from "@/features/marketing/constants";

import { SectionHeading } from "./SectionHeading";

export function LandingFaq() {
  return (
    <section
      id="faq"
      className="mx-auto flex max-w-3xl scroll-mt-24 flex-col gap-10 px-4 py-20 sm:px-6"
    >
      <SectionHeading eyebrow="FAQ" title="Questions, answered" centered />
      <div
        data-reveal
        className="flex flex-col divide-y divide-border/70 rounded-3xl border border-border/80 bg-card/40"
      >
        {LANDING_QUESTIONS.map((item) => (
          <details key={item.question} className="group px-5 sm:px-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45"
              />
            </summary>
            <p className="pb-5 text-sm leading-6 text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
