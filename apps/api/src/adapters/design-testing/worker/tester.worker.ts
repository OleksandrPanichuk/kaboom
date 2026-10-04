import { testDesign } from "@/platform/design-testing/design-testing.helpers";
import type { DesignTestRequest } from "@/platform/design-testing/ports";

declare const self: Worker;

self.onmessage = (event: MessageEvent<DesignTestRequest>) => {
  try {
    postMessage({ ok: true, result: testDesign(event.data) });
  } catch (error) {
    postMessage({
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
