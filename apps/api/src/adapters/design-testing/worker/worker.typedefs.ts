import type {
  DesignTestRequest,
  DesignTestResult,
} from "@/platform/design-testing/ports";

export type WorkerReply =
  | { ready: true }
  | { ok: true; result: DesignTestResult }
  | { ok: false; message: string };

export interface PendingTest {
  request: DesignTestRequest;
  resolve: (result: DesignTestResult) => void;
  reject: (error: Error) => void;
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
