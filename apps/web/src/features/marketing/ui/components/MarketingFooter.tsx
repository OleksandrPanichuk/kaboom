import { Link } from "@tanstack/react-router";

import { BrandMark } from "@/components/BrandMark";
import { LEGAL_DOCUMENTS } from "@/features/marketing/constants";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-16">
        <div className="flex max-w-xs flex-col gap-3">
          <Link to="/" className="flex items-center gap-2.5 font-semibold">
            <BrandMark />
            <span className="text-lg tracking-[-0.03em]">Kaboom</span>
          </Link>
          <p className="text-sm leading-6 text-muted-foreground">
            Practise system design, DevOps and data modelling on designs that
            actually run.
          </p>
        </div>
        <nav aria-label="Product" className="flex flex-col gap-2.5 text-sm">
          <p className="font-medium">Product</p>
          <a
            href="/#features"
            className="text-muted-foreground hover:text-foreground"
          >
            Features
          </a>
          <Link
            to="/pricing"
            className="text-muted-foreground hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            to="/sign-up"
            className="text-muted-foreground hover:text-foreground"
          >
            Create an account
          </Link>
        </nav>
        <nav aria-label="Legal" className="flex flex-col gap-2.5 text-sm">
          <p className="font-medium">Legal</p>
          {LEGAL_DOCUMENTS.map((document) => (
            <Link
              key={document.key}
              to={document.to}
              className="text-muted-foreground hover:text-foreground"
            >
              {document.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl border-t border-border/70 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Kaboom. All rights reserved.
      </div>
    </footer>
  );
}
