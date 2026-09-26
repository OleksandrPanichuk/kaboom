import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-svh overflow-hidden bg-[#f7f7fa] px-4 py-8 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-48 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="absolute right-[-12rem] bottom-[-16rem] size-[32rem] rounded-full bg-sky-100/70 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(24,24,27,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span
            aria-hidden="true"
            className="relative grid size-8 place-items-center rounded-xl bg-zinc-950 shadow-sm shadow-zinc-950/20"
          >
            <span className="size-2.5 rotate-45 rounded-[3px] border-2 border-white" />
          </span>
          <span className="text-base font-semibold tracking-[-0.02em]">
            Kaboom
          </span>
        </div>

        <section className="auth-panel rounded-3xl border border-black/[0.07] bg-white/95 p-5 shadow-[0_24px_70px_-32px_rgba(24,24,27,0.35)] backdrop-blur sm:p-8">
          <div className="mb-7 flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-balance sm:text-[1.75rem]">
              {title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground text-pretty">
              {description}
            </p>
          </div>
          {children}
        </section>

        {footer ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        ) : null}
      </div>
    </main>
  );
}
