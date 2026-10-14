import type { LoadScenarioInput } from "@repo/design";

export interface ReplayRequest {
  title: string;
  scenario: LoadScenarioInput;
  at: number | null;
  nodeIds: string[];
  seed?: number;
  varyFaults?: boolean;
}

export type DesignKind = "system" | "schema";

export interface DesignsSearch {
  kind?: DesignKind;
}
