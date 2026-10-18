import { InlineDesignTester } from "@/adapters/design-testing/inline.design-tester";
import { WorkerDesignTester } from "@/adapters/design-testing/worker";
import { NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind, make } from "@/core/registry";
import { Metrics } from "@/platform/metrics";

import { MeasuredDesignTester } from "./measured.design-tester";
import { DesignTester } from "./ports";

const WORKER_SCRIPT = "./adapters/design-testing/worker/tester.worker";

export const designTestingModule = defineModule({
  name: "design-testing",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const tester = new MeasuredDesignTester(new InlineDesignTester());

      bind(DesignTester, () => tester);

      return { tester, pool: undefined };
    }

    const pool = new WorkerDesignTester({
      size: env.DESIGN_TEST_WORKERS,
      timeoutMs: env.DESIGN_TEST_TIMEOUT_MS,
      script: new URL(WORKER_SCRIPT, Bun.pathToFileURL(Bun.main)),
    });

    const tester = new MeasuredDesignTester(pool);

    bind(DesignTester, () => tester);

    return { tester, pool };
  },

  start: async ({ state }) => {
    if (!state.pool) return;

    const { pool } = state;

    make(Metrics).gauge("designTestQueue", () => pool.waiting());
    await pool.start();
  },
  ready: ({ state }) => state.pool?.healthy() ?? true,
  shutdown: ({ state }) => state.tester.close(),
});
