import { describe, expect, test } from "bun:test";

import { billingTaxIdsSchema, getDatabase } from "@/db";

import { deliverWebhook, memoryProvider, providerCustomer } from "./helpers";

let sequence = 0;

const taxIdEvent = (type: string) =>
  deliverWebhook({
    id: `evt_tax_${++sequence}`,
    type,
    topic: "tax_id",
    objectId: "txi_1",
    customerId: "cus_1",
  });

const taxIds = () => getDatabase().select().from(billingTaxIdsSchema);

describe("tax ids", () => {
  test("a tax id is copied, its verification follows, and deleting it removes it", async () => {
    memoryProvider().setCustomer(providerCustomer());
    memoryProvider().setTaxId({
      id: "txi_1",
      customerId: "cus_1",
      type: "eu_vat",
      value: "DE123456789",
      verificationStatus: "pending",
    });
    await taxIdEvent("customer.tax_id.created");

    expect(await taxIds()).toMatchObject([
      {
        providerTaxId: "txi_1",
        providerCustomerId: "cus_1",
        type: "eu_vat",
        value: "DE123456789",
        verificationStatus: "pending",
      },
    ]);

    memoryProvider().setTaxId({
      id: "txi_1",
      customerId: "cus_1",
      type: "eu_vat",
      value: "DE123456789",
      verificationStatus: "verified",
    });
    await taxIdEvent("customer.tax_id.updated");

    expect((await taxIds())[0]?.verificationStatus).toBe("verified");

    memoryProvider().deleteTaxId("txi_1");
    await taxIdEvent("customer.tax_id.deleted");

    expect(await taxIds()).toEqual([]);
  });
});
