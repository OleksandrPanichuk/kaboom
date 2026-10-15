import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/BrandMark";
import { buttonVariants } from "@/components/ui/Button";
import { currentUserQuery } from "@/features/auth";

const SECTIONS = [
  ["Features", "/#features"],
  ["Interviews", "/#interview"],
  ["Simulation", "/#simulation"],
  ["Tracks", "/#tracks"],
  ["FAQ", "/#faq"],
] as const;

export function MarketingHeader() {
  const user = useQuery(currentUserQuery);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-border/70 bg-background/70 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 font-semibold">
          <BrandMark />
          <span className="text-lg tracking-[-0.03em]">Kaboom</span>
        </Link>
        <nav
          aria-label="Site"
          className="hidden items-center gap-0.5 text-sm text-muted-foreground lg:flex"
        >
          {SECTIONS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 hover:text-foreground"
            >
              {label}
            </a>
          ))}
          <Link
            to="/pricing"
            className="rounded-lg px-3 py-2 hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Pricing
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user.data ? (
            <Link to="/home" className={cn(buttonVariants({ size: "sm" }))}>
              Open the app
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          ) : (
            <>
              <Link
                to="/sign-in"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                Sign in
              </Link>
              <Link
                to="/sign-up"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
