import type { BillingCustomerRow } from "@/db";

import type {
  BillingAddressModel,
  BillingCustomerModel,
} from "./billing-customers.model";

export interface BillingCustomerEntity extends BillingCustomerRow {}

const addressOf = (
  customer: BillingCustomerEntity,
): BillingAddressModel | null => {
  const address = {
    line1: customer.addressLine1,
    line2: customer.addressLine2,
    city: customer.addressCity,
    state: customer.addressState,
    postalCode: customer.addressPostalCode,
    country: customer.addressCountry,
  };

  return Object.values(address).every((part) => part === null) ? null : address;
};

export class BillingCustomerEntity {
  public static normalize(
    customer: BillingCustomerEntity,
  ): BillingCustomerModel {
    return {
      name: customer.name,
      email: customer.email,
      address: addressOf(customer),
      card:
        customer.providerPaymentMethodId === null
          ? null
          : { brand: customer.cardBrand, last4: customer.cardLast4 },
    };
  }
}
