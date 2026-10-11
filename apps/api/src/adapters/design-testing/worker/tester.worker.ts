import { runTask } from "@/platform/design-testing/design-testing.helpers";
import type { DesignTesterTask } from "@/platform/design-testing/ports";

declare const self: Worker;

self.onmessage = (event: MessageEvent<DesignTesterTask>) => {
  try {
    postMessage({ ok: true, result: runTask(event.data) });
  } catch (error) {
    postMessage({
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

postMessage({ ready: true });
