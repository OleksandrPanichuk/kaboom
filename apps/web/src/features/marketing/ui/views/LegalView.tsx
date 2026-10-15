import { Link } from "@tanstack/react-router";
import { cn } from "cn";

import {
  LEGAL,
  LEGAL_DOCUMENTS,
  type LegalDocumentKey,
} from "@/features/marketing/constants";
import {
  COOKIES_CONTENT,
  PRIVACY_CONTENT,
  TERMS_CONTENT,
} from "@/features/marketing/content";
import { LegalDocument } from "@/features/marketing/ui/components";

const CONTENT: Record<LegalDocumentKey, string> = {
  terms: TERMS_CONTENT,
  privacy: PRIVACY_CONTENT,
  cookies: COOKIES_CONTENT,
};

interface LegalViewProps {
  document: LegalDocumentKey;
}

export function LegalView({ document }: LegalViewProps) {
  const current = LEGAL_DOCUMENTS.find((entry) => entry.key === document)!;

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav
          aria-label="Legal documents"
          className="flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:self-start"
        >
          {LEGAL_DOCUMENTS.map((entry) => (
            <Link
              key={entry.key}
              to={entry.to}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                entry.key === document
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.title}
            </Link>
          ))}
        </nav>
        <article className="flex max-w-3xl min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-3">
            <p className="text-sm font-medium text-primary">Legal</p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {current.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              In effect from {LEGAL.effectiveDate}
            </p>
          </header>
          <LegalDocument content={CONTENT[document]} />
        </article>
      </div>
    </div>
  );
}
