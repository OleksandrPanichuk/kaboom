const STATEMENT =
  "A box labelled cache does not make a system fast. A replica you never lose is not redundancy. Kaboom runs your design under the traffic and the failures it claims to survive, and shows you exactly where it does not.";

export function StatementBand() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 sm:py-32">
      <p
        data-highlight
        className="text-3xl leading-[1.25] font-semibold tracking-[-0.03em] text-balance sm:text-5xl"
      >
        {STATEMENT.split(" ").map((word, index) => (
          <span key={index} data-highlight-word className="text-foreground/25">
            {word}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}
