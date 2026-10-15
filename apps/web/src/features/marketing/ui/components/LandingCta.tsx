import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";

interface LandingCtaProps {
  signedIn: boolean;
}

export function LandingCta({ signedIn }: LandingCtaProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div
        data-reveal
        className="relative isolate overflow-hidden rounded-[2rem] border border-primary/30 px-6 py-16 text-center sm:px-12 sm:py-20"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(80%_120%_at_50%_120%,color-mix(in_oklab,var(--primary)_45%,transparent),transparent_70%)] motion-safe:animate-glow"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-card/40" />
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          Your next design review starts here
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Free to start, no card needed. Pick a problem and see how your design
          holds up in a few minutes.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to={signedIn ? "/home" : "/sign-up"}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 px-6 text-base",
            )}
          >
            {signedIn ? "Open the app" : "Start practising free"}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
          <Link
            to="/pricing"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 px-6 text-base",
            )}
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
