import { PLAN_QUESTIONS } from "@/features/billing/constants";

export function PlanQuestions() {
  return (
    <section aria-labelledby="questions-title" className="flex flex-col gap-3">
      <h2
        id="questions-title"
        className="text-lg font-semibold tracking-[-0.02em]"
      >
        Questions
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {PLAN_QUESTIONS.map((item) => (
          <div
            key={item.question}
            className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
          >
            <dt className="font-semibold">{item.question}</dt>
            <dd className="text-sm leading-6 text-muted-foreground text-pretty">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
