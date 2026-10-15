import { useInfiniteQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Download, ExternalLink, Receipt } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { invoicesQuery } from "@/features/billing/api";
import { formatBillingDate, formatMoney } from "@/features/billing/utils";

const STATUS: Record<string, { label: string; tone: string }> = {
  paid: {
    label: "Paid",
    tone: "border-success-border bg-success-surface text-success-foreground",
  },
  open: {
    label: "Due",
    tone: "border-warning-border bg-warning-surface text-warning-foreground",
  },
  void: { label: "Void", tone: "border-border bg-muted text-muted-foreground" },
  uncollectible: {
    label: "Unpaid",
    tone: "border-danger-border bg-danger-surface text-danger-foreground",
  },
  draft: {
    label: "Draft",
    tone: "border-border bg-muted text-muted-foreground",
  },
};

const linkClass =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-interactive-foreground hover:bg-muted";

export function InvoicesSection() {
  const invoices = useInfiniteQuery(invoicesQuery);
  const items = invoices.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-labelledby="invoices-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="invoices-title"
          className="text-lg font-semibold tracking-[-0.02em]"
        >
          Invoices
        </h2>
        <p className="text-sm text-muted-foreground">Newest first</p>
      </div>
      {invoices.isPending ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-10 text-center">
          <Receipt
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">
            {invoices.isError
              ? "Your invoices could not be loaded."
              : "Invoices appear here once you pay for Pro."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-border bg-muted/40 text-xs text-muted-foreground sm:table-header-group">
              <tr>
                <th className="py-2.5 pr-3 pl-5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Invoice</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                <th className="py-2.5 pr-5 pl-3">
                  <span className="sr-only">Links</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((invoice) => {
                const status = STATUS[invoice.status] ?? STATUS.draft!;

                return (
                  <tr
                    key={invoice.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 sm:table-row sm:p-0"
                  >
                    <td className="font-medium sm:py-3 sm:pr-3 sm:pl-5">
                      {formatBillingDate(invoice.createdAt)}
                    </td>
                    <td className="col-start-1 row-start-2 font-mono text-xs text-muted-foreground sm:px-3 sm:py-3">
                      {invoice.number ?? "—"}
                    </td>
                    <td className="col-start-2 row-start-2 justify-self-end sm:px-3 sm:py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-medium",
                          status.tone,
                        )}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="col-start-2 row-start-1 text-right font-semibold tabular-nums sm:px-3 sm:py-3">
                      {formatMoney(invoice.total, invoice.currency)}
                    </td>
                    <td className="col-span-2 flex justify-start gap-1 sm:table-cell sm:py-2 sm:pr-5 sm:pl-3 sm:text-right">
                      {invoice.hostedUrl ? (
                        <a
                          href={invoice.hostedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(linkClass, "-ml-2 sm:ml-0")}
                        >
                          {invoice.status === "open" ? "Pay" : "View"}
                          <ExternalLink
                            aria-hidden="true"
                            className="size-3.5"
                          />
                        </a>
                      ) : null}
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={linkClass}
                        >
                          <Download aria-hidden="true" className="size-3.5" />
                          PDF
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {invoices.hasNextPage ? (
        <div>
          <Button
            variant="outline"
            size="sm"
            disabled={invoices.isFetchingNextPage}
            onClick={() => void invoices.fetchNextPage()}
          >
            {invoices.isFetchingNextPage ? "Loading…" : "Show older invoices"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
