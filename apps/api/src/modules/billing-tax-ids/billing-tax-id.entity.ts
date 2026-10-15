import type { BillingTaxIdRow } from "@/db";

import type { BillingTaxIdModel } from "./billing-tax-ids.model";

export interface BillingTaxIdEntity extends BillingTaxIdRow {}

export class BillingTaxIdEntity {
  public static normalize(taxId: BillingTaxIdEntity): BillingTaxIdModel {
    return {
      id: taxId.id,
      type: taxId.type,
      value: taxId.value,
      verificationStatus: taxId.verificationStatus,
    };
  }
}
