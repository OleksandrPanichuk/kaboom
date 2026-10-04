import type {
  DesignTestRequest,
  DesignTestResult,
} from "@/platform/design-testing/ports";

export type WorkerReply =
  { ok: true; result: DesignTestResult } | { ok: false; message: string };

export interface PendingTest {
  request: DesignTestRequest;
  resolve: (result: DesignTestResult) => void;
  reject: (error: Error) => void;
}

export interface WorkerDesignTesterOptions {
  size: number;
  timeoutMs: number;
  script: URL;
}
