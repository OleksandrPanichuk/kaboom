export type OpRejectionReason =
  | "invalid-op"
  | "duplicate-id"
  | "unknown-node"
  | "unknown-edge"
  | "unknown-group"
  | "invalid-props"
  | "invalid-edge"
  | "load-cycle"
  | "group-not-empty"
  | "too-large";

export interface OpRejection {
  ok: false;
  index: number;
  reason: OpRejectionReason;
  message: string;
}

export class RejectedOp extends Error {
  public override readonly name = "RejectedOp";

  constructor(
    public readonly reason: OpRejectionReason,
    message: string,
  ) {
    super(message);
  }
}

export const reject = (reason: OpRejectionReason, message: string): never => {
  throw new RejectedOp(reason, message);
};
