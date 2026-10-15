import { useInfiniteQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { ExternalLink, FileText, Receipt } from "lucide-react";

import { SettingsSection } from "@/components/SettingsSection";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { invoicesQuery } from "@/features/billing/api";
import { formatBillingDate, formatMoney } from "@/features/billing/utils";

const STATUS: Record<string, { label: string; tone: string }> = {
  paid: { label: "Paid", tone: "bg-success-surface text-success-foreground" },
  open: { label: "Due", tone: "bg-warning-surface text-warning-foreground" },
  void: { label: "Void", tone: "bg-muted text-muted-foreground" },
  uncollectible: {
    label: "Unpaid",
    tone: "bg-danger-surface text-danger-foreground",
  },
  draft: { label: "Draft", tone: "bg-muted text-muted-foreground" },
};

export function InvoicesSection() {
  const invoices = useInfiniteQuery(invoicesQuery);
  const items = invoices.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SettingsSection
      title="Invoices"
      description="Every invoice, newest first, to view or download."
      icon={Receipt}
    >
      <div className="flex flex-col gap-4">
        {invoices.isPending ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
            {invoices.isError
              ? "Your invoices could not be loaded."
              : "No invoices yet."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-muted/60">
            {items.map((invoice) => {
              const status = STATUS[invoice.status] ?? STATUS.draft!;

              return (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-4"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {formatMoney(invoice.total, invoice.currency)}
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                          status.tone,
                        )}
                      >
                        {status.label}
                      </span>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[formatBillingDate(invoice.createdAt), invoice.number]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {invoice.hostedUrl ? (
                      <a
                        href={invoice.hostedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-interactive-foreground hover:bg-muted"
                      >
                        {invoice.status === "open" ? "Pay" : "View"}
                        <ExternalLink aria-hidden="true" className="size-3.5" />
                      </a>
                    ) : null}
                    {invoice.pdfUrl ? (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-interactive-foreground hover:bg-muted"
                      >
                        <FileText aria-hidden="true" className="size-3.5" />
                        PDF
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {invoices.hasNextPage ? (
          <div>
            <Button
              variant="outline"
              disabled={invoices.isFetchingNextPage}
              onClick={() => void invoices.fetchNextPage()}
            >
              {invoices.isFetchingNextPage ? "Loading…" : "Show older invoices"}
            </Button>
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}
