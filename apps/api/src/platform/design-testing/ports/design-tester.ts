import type { DesignGraph } from "@repo/design";
import type { ProblemContent, Score, TestReport } from "@repo/scoring";

import { Port } from "@/core/port";

export interface DesignTestRequest {
  problem: ProblemContent;
  graph: DesignGraph;
  include: "public" | "all";
  seeds: number;
}

export interface DesignTestResult {
  score: Score;
  report: TestReport;
}

export abstract class DesignTester extends Port {
  public abstract test(request: DesignTestRequest): Promise<DesignTestResult>;

  public abstract close(): Promise<void>;
}
