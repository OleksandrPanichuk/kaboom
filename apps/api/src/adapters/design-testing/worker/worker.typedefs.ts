import type { DesignTesterTask } from "@/platform/design-testing/ports";

export type WorkerReply =
  | { ready: true }
  | { ok: true; result: unknown }
  | { ok: false; message: string };

export interface PendingTest {
  task: DesignTesterTask;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  priority: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  worker: Worker | null;
}

export interface WorkerDesignTesterOptions {
  size: number;
  timeoutMs: number;
  script: URL;
  bootTimeoutMs?: number;
  maxQueued?: number;
}
