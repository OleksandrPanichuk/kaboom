import {
  applyOps,
  type DesignGraph,
  type DesignOp,
  type OpRejection,
} from "@repo/design";

export interface DesignSnapshot {
  revision: number;
  graph: DesignGraph;
}

export type SendOpsResult =
  | { ok: true; snapshot: DesignSnapshot }
  | { ok: false; conflict: true }
  | { ok: false; conflict: false; error: unknown };

export interface DesignWriterState {
  graph: DesignGraph;
  revision: number;
  saving: boolean;
  error: string | null;
  canUndo: boolean;
  canRedo: boolean;
}

interface HistoryStep {
  ops: DesignOp[];
  inverse: DesignOp[];
}

export interface DesignWriterIo {
  send: (baseRevision: number, ops: DesignOp[]) => Promise<SendOpsResult>;
  fetchLatest: () => Promise<DesignSnapshot>;
  onChange: (state: DesignWriterState) => void;
  onConfirmed?: (snapshot: DesignSnapshot) => void;
  describeError: (error: unknown) => string;
}

const MAX_CONSECUTIVE_CONFLICTS = 3;

export const CONFLICT_DROPPED =
  "The design changed elsewhere, and one of your changes no longer fits it.";

export const CONFLICT_GAVE_UP =
  "The design keeps changing elsewhere. Your latest changes were not saved.";

export const CANNOT_UNDO =
  "That change can no longer be undone: the design has changed since.";

export const CANNOT_REDO =
  "That change can no longer be redone: the design has changed since.";

const MAX_HISTORY = 100;

export class DesignWriter {
  private pending: DesignOp[][] = [];
  private past: HistoryStep[] = [];
  private future: HistoryStep[] = [];
  private sending = false;
  private error: string | null = null;

  constructor(
    private confirmed: DesignSnapshot,
    private readonly io: DesignWriterIo,
  ) {}

  public get state(): DesignWriterState {
    return {
      graph: this.displayed(),
      revision: this.confirmed.revision,
      saving: this.sending || this.pending.length > 0,
      error: this.error,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
    };
  }

  public check(ops: DesignOp[]): OpRejection | null {
    const result = applyOps(this.displayed(), ops);

    return result.ok ? null : result;
  }

  public apply(ops: DesignOp[]): string | null {
    const inverse = this.enqueue(ops);

    if (typeof inverse === "string") return inverse;

    this.past = [...this.past, { ops, inverse }].slice(-MAX_HISTORY);
    this.future = [];
    this.emit();

    return null;
  }

  public undo(): void {
    this.step(this.past, this.future, CANNOT_UNDO);
  }

  public redo(): void {
    this.step(this.future, this.past, CANNOT_REDO);
  }

  public reportError(message: string): void {
    this.error = message;
    this.emit();
  }

  public dismissError(): void {
    this.error = null;
    this.emit();
  }

  private enqueue(ops: DesignOp[]): DesignOp[] | string {
    const result = applyOps(this.displayed(), ops);

    if (!result.ok) return result.message;

    this.pending.push(ops);
    this.error = null;
    void this.flush();

    return result.inverse;
  }

  private step(from: HistoryStep[], to: HistoryStep[], failure: string): void {
    const entry = from.pop();

    if (!entry) return;

    const inverse = this.enqueue(entry.inverse);

    if (typeof inverse === "string") {
      this.error = failure;
    } else {
      to.push({ ops: entry.inverse, inverse });
    }

    this.emit();
  }

  private displayed(): DesignGraph {
    let graph = this.confirmed.graph;

    for (const batch of this.pending) {
      const result = applyOps(graph, batch);

      if (result.ok) graph = result.graph;
    }

    return graph;
  }

  private rebase(): boolean {
    let graph = this.confirmed.graph;
    const kept: DesignOp[][] = [];

    for (const batch of this.pending) {
      const result = applyOps(graph, batch);

      if (result.ok) {
        graph = result.graph;
        kept.push(batch);
      }
    }

    const dropped = kept.length < this.pending.length;

    this.pending = kept;

    return dropped;
  }

  private async flush(): Promise<void> {
    if (this.sending) return;

    this.sending = true;
    let conflicts = 0;

    try {
      while (this.pending.length > 0) {
        const batch = this.pending[0]!;
        const result = await this.io.send(this.confirmed.revision, batch);

        if (result.ok) {
          conflicts = 0;
          this.confirmed = result.snapshot;
          this.pending.shift();
          this.io.onConfirmed?.(result.snapshot);
        } else if (result.conflict) {
          conflicts += 1;
          this.confirmed = await this.io.fetchLatest();
          this.io.onConfirmed?.(this.confirmed);

          if (conflicts >= MAX_CONSECUTIVE_CONFLICTS) {
            this.pending = [];
            this.error = CONFLICT_GAVE_UP;
          } else if (this.rebase()) {
            this.error = CONFLICT_DROPPED;
          }
        } else {
          this.pending.shift();
          this.error = this.io.describeError(result.error);
        }

        this.emit();
      }
    } catch (error) {
      this.pending = [];
      this.error = this.io.describeError(error);
    } finally {
      this.sending = false;
      this.emit();
    }
  }

  private emit(): void {
    this.io.onChange(this.state);
  }
}
