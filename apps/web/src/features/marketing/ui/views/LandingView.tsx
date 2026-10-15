import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRef } from "react";

import { buttonVariants } from "@/components/ui/Button";
import { currentUserQuery } from "@/features/auth";
import { useLandingMotion } from "@/features/marketing/hooks";
import {
  CommunitySection,
  ComparisonSection,
  CostSection,
  DataModelShowcase,
  FeatureGrid,
  GrowthSection,
  HeroHeadline,
  HeroScene,
  HeroVisual,
  InterviewStory,
  LandingCta,
  LandingFaq,
  LoadShowcase,
  PricingTeaser,
  StackMarquee,
  StatementBand,
  StepsSection,
  TestReportSection,
  TracksSection,
} from "@/features/marketing/ui/components";

export function LandingView() {
  const user = useQuery(currentUserQuery);
  const signedIn = Boolean(user.data);
  const root = useRef<HTMLDivElement>(null);

  useLandingMotion(root);

  return (
    <div ref={root} className="relative isolate overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60rem] bg-[radial-gradient(45%_55%_at_75%_25%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent),radial-gradient(40%_45%_at_5%_15%,color-mix(in_oklab,var(--interactive)_22%,transparent),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[56rem] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)] bg-[size:56px_56px] opacity-40"
      />
      <div data-hero-section className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(75%_85%_at_70%_45%,black_35%,transparent)] max-lg:[mask-image:radial-gradient(90%_60%_at_50%_75%,black_30%,transparent)]"
        >
          <HeroScene />
        </div>
        <section className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-14 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:pt-24">
          <div className="flex flex-col gap-6">
            <p
              data-hero
              className="flex w-fit items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
            >
              <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
              Mock interviews that test the design, not the diagram
            </p>
            <HeroHeadline />
            <p
              data-hero
              className="max-w-xl text-lg leading-8 text-muted-foreground text-pretty"
            >
              Draw the architecture, then watch it take load. Kaboom simulates
              traffic, injects failures and reviews your interview, so you find
              where it breaks before an interviewer does.
            </p>
            <div data-hero className="flex flex-wrap gap-3">
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
              <a
                href="#features"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 px-6 text-base",
                )}
              >
                See how it works
              </a>
            </div>
            <p data-hero className="text-sm text-muted-foreground">
              Free to start · No card needed · System design, DevOps and data
              modelling
            </p>
          </div>
          <div data-hero-visual>
            <div data-tilt-soft>
              <HeroVisual />
            </div>
          </div>
        </section>
      </div>
      <StackMarquee />
      <StatementBand />
      <FeatureGrid />
      <InterviewStory />
      <LoadShowcase />
      <TestReportSection />
      <TracksSection />
      <DataModelShowcase />
      <CostSection />
      <GrowthSection />
      <CommunitySection />
      <StepsSection />
      <ComparisonSection />
      <PricingTeaser />
      <LandingFaq />
      <LandingCta signedIn={signedIn} />
    </div>
  );
}
