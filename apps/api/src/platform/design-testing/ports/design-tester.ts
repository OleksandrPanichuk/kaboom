import type {
  DesignBundle,
  ProblemContent,
  PublishCheck,
  Score,
  TestReport,
} from "@repo/scoring";

import { Port } from "@/core/port";

export interface DesignTestRequest {
  problem: ProblemContent;
  bundle: DesignBundle;
  include: "public" | "all";
  seeds: number;
}

export interface DesignTestResult {
  score: Score;
  report: TestReport;
}

export type DesignTesterTask =
  | { task: "test"; request: DesignTestRequest }
  | { task: "check"; content: unknown };

export abstract class DesignTester extends Port {
  public abstract test(request: DesignTestRequest): Promise<DesignTestResult>;

  public abstract check(content: unknown): Promise<PublishCheck>;

  public abstract close(): Promise<void>;
}
