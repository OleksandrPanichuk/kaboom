export const TAX_ID_TYPES = [
  { value: "eu_vat", label: "EU VAT number" },
  { value: "gb_vat", label: "UK VAT number" },
  { value: "ch_vat", label: "Swiss VAT number" },
  { value: "no_vat", label: "Norwegian VAT number" },
  { value: "us_ein", label: "US EIN" },
  { value: "ca_bn", label: "Canadian BN" },
  { value: "au_abn", label: "Australian ABN" },
  { value: "in_gst", label: "Indian GST number" },
  { value: "ua_vat", label: "Ukrainian VAT number" },
] as const;

export const taxIdLabel = (type: string): string =>
  TAX_ID_TYPES.find((option) => option.value === type)?.label ??
  type.toUpperCase().replace("_", " ");
