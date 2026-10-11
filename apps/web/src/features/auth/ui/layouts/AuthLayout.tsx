import type { ReactNode } from "react";

import { BrandMark } from "@/components/BrandMark";

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
    <main className="relative flex min-h-svh overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <BrandMark />
          <span className="text-base font-semibold tracking-[-0.02em]">
            Kaboom
          </span>
        </div>

        <section className="auth-panel rounded-3xl border border-border bg-card p-5 shadow-card sm:p-8">
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
