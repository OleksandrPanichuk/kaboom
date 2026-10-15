import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";

import { PaymentEntity } from "../payment.entity";
import { PaymentModel } from "../payments.model";
import type { PaymentsActions } from "../payments.routes";

export const listPaymentsRoute = ({ listPayments }: PaymentsActions) =>
  defineRoute({
    query: PageQuery,
    response: PageModel(PaymentModel),
    summary: "List your payments, newest first",
    description:
      "Every payment taken or attempted, with the card it was made with and, for one that failed, why.",
    auth: true,

    action: ({ user, query }) =>
      listPayments.execute({ userId: user.id, page: toPageRequest(query) }),
    postAction: ({ output }) => mapPage(output, PaymentEntity.normalize),
  });
