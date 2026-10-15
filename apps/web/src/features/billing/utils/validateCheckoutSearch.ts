export interface CheckoutSearch {
  offer: string;
}

export interface CheckoutCompleteSearch {
  offer?: string;
  redirect_status?: string;
}

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

export const validateCheckoutSearch = (
  search: Record<string, unknown>,
): CheckoutSearch => ({ offer: text(search.offer) ?? "" });

export const validateCheckoutCompleteSearch = (
  search: Record<string, unknown>,
): CheckoutCompleteSearch => ({
  offer: text(search.offer),
  redirect_status: text(search.redirect_status),
});
