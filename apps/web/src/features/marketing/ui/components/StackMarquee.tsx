import { STACK_ICONS } from "@/features/marketing/constants";

export function StackMarquee() {
  const icons = [...STACK_ICONS, ...STACK_ICONS];

  return (
    <section
      aria-label="Technologies in the catalogue"
      className="flex flex-col gap-6 py-10"
    >
      <p className="text-center text-sm text-muted-foreground">
        Design with the products you will meet at work
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <ul className="flex w-max gap-12 motion-safe:animate-marquee">
          {icons.map((icon, index) => (
            <li
              key={`${icon.slug}-${index}`}
              aria-hidden={index >= STACK_ICONS.length}
              className="flex items-center gap-2.5 text-muted-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-6 fill-current"
                aria-hidden="true"
              >
                <path d={icon.path} />
              </svg>
              <span className="text-sm font-medium whitespace-nowrap">
                {icon.title}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
