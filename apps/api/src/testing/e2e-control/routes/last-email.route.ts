import { t } from "elysia";

import type { MemoryMailer } from "@/adapters/mail/memory.mailer";
import { NotFoundError } from "@/core/errors";
import { make } from "@/core/registry";
import { defineRoute } from "@/core/route";
import { Mailer } from "@/modules/notifications";

export const lastEmailRoute = () =>
  defineRoute({
    query: t.Object({ to: t.String({ format: "email" }) }),
    response: t.Object({ subject: t.String(), text: t.String() }),
    summary: "The last email sent to an address, for end-to-end tests",

    action: ({ query }) => {
      const sent = (make(Mailer) as MemoryMailer).sentTo(query.to).at(-1);

      if (!sent) throw new NotFoundError(`No email was sent to ${query.to}`);

      return Promise.resolve({ subject: sent.subject, text: sent.text });
    },
  });
