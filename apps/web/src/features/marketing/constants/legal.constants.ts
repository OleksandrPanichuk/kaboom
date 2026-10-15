export const LEGAL = {
  product: "Kaboom",
  operator: "[Company legal name]",
  address: "[Registered address]",
  contactEmail: "[contact email]",
  governingLaw: "[country or state]",
  effectiveDate: "15 October 2026",
} as const;

export type LegalDocumentKey = "terms" | "privacy" | "cookies";

export const LEGAL_DOCUMENTS: ReadonlyArray<{
  key: LegalDocumentKey;
  title: string;
  to: "/terms" | "/privacy" | "/cookies";
}> = [
  { key: "terms", title: "Terms of use", to: "/terms" },
  { key: "privacy", title: "Privacy policy", to: "/privacy" },
  { key: "cookies", title: "Cookie policy", to: "/cookies" },
];
