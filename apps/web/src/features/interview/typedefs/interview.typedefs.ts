export interface DurableEvent {
  seq: number;
  type:
    "message" | "revision" | "phase" | "simulation" | "highlight" | "status";
  payload: Record<string, unknown>;
  at: string;
}

export interface LiveTurn {
  turnId: string;
  text: string;
}
